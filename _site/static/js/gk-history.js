/*!
 * gk-history.js — conversation history for the Gary King AI avatar.
 *
 * Both chat surfaces — the popup widget (js/gking-chat-widget.js) and the
 * full-page /ask-gary (layouts/chatbot/single.html) — keep their transcripts
 * here, so a visitor can come back, find what they asked before, and carry on
 * in the same conversation. There is no login: the store is this browser, and
 * only this browser. Both surfaces share it, so a chat started in the popup
 * can be finished on /ask-gary.
 *
 * ── Privacy posture ───────────────────────────────────────────────────────
 * This is the only DURABLE device storage in the chat, and unlike the
 * per-tab conversation id it has always kept, it holds the text of what
 * people asked. So state the claim honestly rather than inheriting it: this
 * is not analytics and it is not an identifier. It exists solely to deliver
 * the feature the visitor asked for — the ePrivacy Art. 5(3) "strictly
 * necessary" carve-out, on the same footing as a shopping cart. Three things
 * are load-bearing for that:
 *
 *   1. Nothing here is ever sent anywhere. gk-track.js neither reads nor
 *      writes these keys, and no event ever carries a title or message text.
 *   2. There is no visitor id. The only id used is the conversation_id the
 *      chat already mints per conversation, which the server already sees.
 *   3. Both surfaces show "Saved in this browser only" with a Clear control
 *      next to the list, and entries expire on their own after TTL_DAYS.
 *
 * If any of those three stops being true, this needs a consent gate first.
 *
 * ── Shape ─────────────────────────────────────────────────────────────────
 * Reads and writes are Promise-based even though localStorage is synchronous.
 * That is the entire point: when history moves server-side, makeLocalBackend()
 * is swapped for a fetch-backed one and no call site in either surface
 * changes. The active-conversation pointer stays synchronous, because
 * ensureConversationId() is called inline while building a request body and
 * cannot become async without rewriting send().
 *
 * That pointer lives in sessionStorage under each surface's existing key
 * (gk_conv / gk_conv_widget) and keeps its old meaning: which conversation
 * THIS TAB is looking at. Per-tab by construction, so two open tabs never
 * fight over it — while the archive below is shared across them.
 *
 * ES5 syntax (both surfaces ship with no build step) plus native Promise,
 * which the widget's async send() already requires.
 *
 * NOT mirrored to gking-avatar-v3 — do not add it to check_shared_parity.mjs.
 */
(function (root) {
  "use strict";

  var SCHEMA_V = 1;

  var INDEX_KEY = "gk_hist_index_v1";
  var CONV_PREFIX = "gk_hist_conv_v1:";
  var UI_KEY = "gk_hist_ui_v1";
  var PROBE_KEY = "gk_hist_probe";

  /* Budgets. Bytes, not count, is the real constraint: one answer carrying
     eight figures runs ~80KB, so thirty conversations is a loose ceiling and
     MAX_TOTAL_BYTES is the one that actually bites. ~1.5MB is roughly 30% of
     the ~5MB origin budget; the rest of the site gets the remainder. */
  var MAX_CONVERSATIONS = 30;
  var MAX_TOTAL_BYTES = 1500000;
  var MAX_MESSAGES_PER_CONV = 200;
  var MAX_CHARS_PER_MESSAGE = 20000;
  var TTL_DAYS = 30;
  var TITLE_CHARS = 60;

  /* Uploads live in S3 under uploads/<conversation_id>/ behind a 24h
     lifecycle rule, and the server unions attachments across the whole
     conversation by file_id. Past this point the file_ids are dead and must
     never be resent. */
  var UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;

  var SAVE_DEBOUNCE_MS = 500;

  // ── storage plumbing ─────────────────────────────────────────────────────
  // Every access is individually wrapped. Chat must never break because
  // storage did — same idiom as the sessionStorage calls in both surfaces.

  var degraded = null; // null | "unavailable" | "quota" | "future-schema"

  function store() {
    try { return root.localStorage; } catch (e) { return null; }
  }

  function rawGet(key) {
    try {
      var s = store();
      return s ? s.getItem(key) : null;
    } catch (e) { return null; }
  }

  /** Throws on quota so the save ladder can catch it — the only method here
   *  that is allowed to throw. */
  function rawSet(key, value) {
    var s = store();
    if (!s) throw new Error("no storage");
    s.setItem(key, value);
  }

  function rawDel(key) {
    try {
      var s = store();
      if (s) s.removeItem(key);
    } catch (e) {}
  }

  function isQuotaError(e) {
    if (!e) return false;
    return e.code === 22 || e.code === 1014 ||
      e.name === "QuotaExceededError" ||
      e.name === "NS_ERROR_DOM_QUOTA_REACHED";
  }

  function readJSON(key) {
    var raw = rawGet(key);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { rawDel(key); return null; }
  }

  /* A cached widget bundle can outlive a deploy by days (long cache + a ?v=
     buster), so an OLD script can genuinely meet a NEW store. Reading a
     record it does not understand, then overwriting it with its own idea of
     the schema, would silently destroy the newer data. Refuse instead. */
  function versionOk(rec) {
    if (!rec || typeof rec.v !== "number") return false;
    if (rec.v > SCHEMA_V) { degraded = "future-schema"; return false; }
    return true;
  }

  function bytesOf(str) { return str ? str.length : 0; }

  // ── index ────────────────────────────────────────────────────────────────

  function emptyIndex() { return { v: SCHEMA_V, updatedAt: 0, items: [] }; }

  function readIndex() {
    var idx = readJSON(INDEX_KEY);
    if (!idx || !versionOk(idx)) return emptyIndex();
    if (!isArray(idx.items)) idx.items = [];
    return idx;
  }

  function isArray(v) { return Object.prototype.toString.call(v) === "[object Array]"; }

  function writeIndex(idx) {
    idx.v = SCHEMA_V;
    idx.updatedAt = now();
    idx.items.sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
    rawSet(INDEX_KEY, JSON.stringify(idx));
  }

  function findEntry(idx, id) {
    for (var i = 0; i < idx.items.length; i++) {
      if (idx.items[i].id === id) return i;
    }
    return -1;
  }

  /* Strictly increasing. Two saves inside the same millisecond would
     otherwise tie on updatedAt and the list order would be arbitrary — which
     shows up as a conversation refusing to move to the top after a turn. */
  var lastStamp = 0;
  function now() {
    var t = new Date().getTime();
    if (t <= lastStamp) t = lastStamp + 1;
    lastStamp = t;
    return t;
  }

  // ── titles and time ──────────────────────────────────────────────────────

  /* Attachment markers the backend reads are inlined into message content by
     both surfaces; they must not leak into a title. Mirrors stripAttachTags()
     / stripAttach() on the two surfaces. */
  function stripAttachTags(text) {
    return String(text || "").replace(/\[\[attach:[^\]]*\]\]/g, "");
  }

  function deriveTitle(messages) {
    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      if (!m || m.role !== "user") continue;
      var t = stripAttachTags(m.content)
        .replace(/[`*_>#]/g, "")
        .replace(/\s+/g, " ")
        .replace(/^\s+|\s+$/g, "");
      if (t) {
        return t.length > TITLE_CHARS ? t.slice(0, TITLE_CHARS - 1) + "…" : t;
      }
      // An attachment-only opener ("Take a look at this.") is better named by
      // the file than by the sentence.
      if (m.attachmentChips && m.attachmentChips.length && m.attachmentChips[0].name) {
        return String(m.attachmentChips[0].name).slice(0, TITLE_CHARS);
      }
    }
    return "New chat";
  }

  function relativeTime(ts) {
    if (!ts) return "";
    var diff = now() - ts;
    if (diff < 60000) return "Just now";
    var mins = Math.floor(diff / 60000);
    if (mins < 60) return mins + " min ago";
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + (hrs === 1 ? " hour ago" : " hours ago");
    var days = Math.floor(hrs / 24);
    if (days === 1) return "Yesterday";
    if (days < 7) return days + " days ago";
    var weeks = Math.floor(days / 7);
    if (weeks < 5) return weeks + (weeks === 1 ? " week ago" : " weeks ago");
    var months = Math.floor(days / 30);
    return months + (months === 1 ? " month ago" : " months ago");
  }

  // ── the serializer ───────────────────────────────────────────────────────

  /* A whitelist, deliberately, not a blacklist: if a future field on a
     message holds a live object the way `steps` does, it stays out of the
     store by default rather than poisoning it silently. */
  function serializeMessage(m) {
    var out = {
      id: m.id,
      role: m.role,
      content: String(m.content || "").slice(0, MAX_CHARS_PER_MESSAGE)
    };
    if (m.attachments && m.attachments.length) out.attachments = m.attachments;
    if (m.attachmentChips && m.attachmentChips.length) out.attachmentChips = m.attachmentChips;
    if (m.figures && m.figures.length) out.figures = m.figures;
    if (m.previews && m.previews.length) out.previews = m.previews;
    if (m.meta) out.meta = m.meta;
    // Send time (epoch ms) of a user turn; both surfaces show it above the bubble.
    if (typeof m.at === "number") out.at = m.at;

    /* `steps` is a GKSteps thread — an object of closures. JSON.stringify
       flattens it to {"serverStepCount":0}, which is worse than useless. Keep
       the labels instead; hydrate() rebuilds a frozen stand-in from them so a
       restored thread can still be expanded. gk-steps.js itself is
       parity-locked against gking-avatar-v3 and must not gain a restore(). */
    if (m.steps && typeof m.steps.count === "function") {
      try {
        var labels = [];
        var live = m.steps.steps() || [];
        for (var i = 0; i < live.length; i++) {
          labels.push({ id: live[i].id, label: live[i].label });
        }
        if (labels.length) {
          out.stepsSaved = {
            summary: m.steps.summary(),
            count: m.steps.count(),
            steps: labels
          };
        }
      } catch (e) {}
    }
    return out;
  }

  function serializeMessages(messages) {
    var src = messages || [];
    var list = [];
    for (var i = 0; i < src.length; i++) {
      var m = src[i];
      if (!m || !m.role) continue;
      /* The last assistant slot is pushed empty before the first token
         arrives. A stream that died there left a placeholder, not content.
         A trailing USER message is kept — the question is worth more than
         the answer that never came, and the stateless API just appends. */
      if (i === src.length - 1 && m.role === "assistant" && !String(m.content || "").replace(/\s/g, "")) {
        continue;
      }
      list.push(serializeMessage(m));
    }
    if (list.length > MAX_MESSAGES_PER_CONV) {
      list = list.slice(list.length - MAX_MESSAGES_PER_CONV);
    }
    return list;
  }

  function countTurns(messages) {
    var n = 0;
    for (var i = 0; i < messages.length; i++) {
      if (messages[i].role === "user") n++;
    }
    return n;
  }

  function hasAttachments(messages) {
    for (var i = messages.length - 1; i >= 0; i--) {
      if (messages[i].attachments && messages[i].attachments.length) return true;
    }
    return false;
  }

  // ── hydration ────────────────────────────────────────────────────────────

  /* A finished thread read back from storage. Duck-typed to the subset of the
     GKSteps interface that renderStepsHtml() and the error path actually call
     — seal() in particular, because the catch block seals EVERY message's
     thread, not just the live one. */
  function restoredThread(saved) {
    var steps = (saved && saved.steps) || [];
    return {
      /* Deliberately no `serverStepCount` data property. The widget sends the
         messages array verbatim, so a plain field here would ride along on
         every future turn as {"serverStepCount":N}; with only methods, this
         serializes to {} and a resumed conversation stays as light on the
         wire as a fresh one. Nothing outside gk-steps.js reads the field. */
      steps: function () { return steps; },
      count: function () { return (saved && saved.count) || steps.length; },
      isEmpty: function () { return steps.length === 0; },
      isFinished: function () { return true; },
      isVisible: function () { return steps.length > 0; },
      liveStep: function () { return null; },
      summary: function () { return (saved && saved.summary) || null; },
      seal: function () {},
      reset: function () {},
      addStep: function () {},
      completeStep: function () {},
      finish: function () {}
    };
  }

  /**
   * Turn a stored conversation back into the live state the surfaces expect.
   * Returns {messages, feedbackState, ratingDone, attachmentsExpired}.
   */
  function hydrate(conv) {
    var out = {
      id: conv.id,
      title: conv.title,
      surface: conv.surface,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      ratingDone: !!conv.ratingDone,
      attachmentsExpired: false,
      messages: [],
      feedbackState: {}
    };

    var expired = !!(conv.attachmentsExpireAt && now() > conv.attachmentsExpireAt);

    var src = conv.messages || [];
    for (var i = 0; i < src.length; i++) {
      var s = src[i];
      var m = {
        id: s.id,
        role: s.role,
        content: s.content
      };
      if (s.attachmentChips) m.attachmentChips = s.attachmentChips;
      if (s.figures) m.figures = s.figures;
      if (s.previews) m.previews = s.previews;
      if (s.meta) m.meta = s.meta;
      if (typeof s.at === "number") m.at = s.at;
      if (s.attachments) {
        /* Dead file_ids must never go back on the wire: the server unions
           attachments across the whole conversation, so one expired id would
           poison every future turn. The display chips stay, dimmed, so the
           transcript still makes sense. */
        if (expired) {
          out.attachmentsExpired = true;
          m.attachmentsExpired = true;
        } else {
          m.attachments = s.attachments;
        }
      }
      if (s.stepsSaved) m.steps = restoredThread(s.stepsSaved);
      out.messages.push(m);
    }

    /* Only the settled half of the feedback state comes back. A half-typed
       comment reappearing days later is confusing, and the endpoint is
       fire-and-forget anyway. */
    var fb = conv.feedback || {};
    for (var k in fb) {
      if (!Object.prototype.hasOwnProperty.call(fb, k)) continue;
      out.feedbackState[k] = {
        rated: fb[k].rated || null,
        commentOpen: false,
        commentDraft: "",
        commentSent: !!fb[k].commentSent
      };
    }
    return out;
  }

  function serializeFeedback(feedbackState) {
    var out = {};
    var fb = feedbackState || {};
    for (var k in fb) {
      if (!Object.prototype.hasOwnProperty.call(fb, k)) continue;
      if (!fb[k]) continue;
      if (!fb[k].rated && !fb[k].commentSent) continue;
      out[k] = { rated: fb[k].rated || null, commentSent: !!fb[k].commentSent };
    }
    return out;
  }

  // ── the local backend ────────────────────────────────────────────────────
  // The single seam. Replace makeLocalBackend() with a fetch-backed one and
  // nothing above or outside this file changes.

  function makeLocalBackend() {

    /** What updatedAt we last saw for each id, so a concurrent write from
     *  another tab is detectable rather than silently clobbered. */
    var seenVersion = {};

    function convKey(id) { return CONV_PREFIX + id; }

    function totalBytes(idx) {
      var n = bytesOf(rawGet(INDEX_KEY));
      for (var i = 0; i < idx.items.length; i++) n += idx.items[i].bytes || 0;
      return n;
    }

    /** Drop TTL-expired and over-cap conversations. Cheap; runs on init. */
    function sweep() {
      var idx = readIndex();
      if (!idx.items.length) return idx;
      var cutoff = now() - TTL_DAYS * 24 * 60 * 60 * 1000;
      var keep = [];
      var dropped = false;
      for (var i = 0; i < idx.items.length; i++) {
        var it = idx.items[i];
        if ((it.updatedAt || 0) < cutoff) { rawDel(convKey(it.id)); dropped = true; continue; }
        keep.push(it);
      }
      keep.sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
      while (keep.length > MAX_CONVERSATIONS) {
        rawDel(convKey(keep[keep.length - 1].id));
        keep.pop();
        dropped = true;
      }
      if (dropped) {
        idx.items = keep;
        try { writeIndex(idx); } catch (e) {}
      } else {
        idx.items = keep;
      }
      return idx;
    }

    /** Strip the heaviest optional payloads from all but the newest turns. */
    function slim(conv) {
      var cut = Math.max(0, conv.messages.length - 4);
      var changed = false;
      for (var i = 0; i < cut; i++) {
        if (conv.messages[i].figures) { delete conv.messages[i].figures; changed = true; }
        if (conv.messages[i].previews) { delete conv.messages[i].previews; changed = true; }
      }
      return changed;
    }

    /**
     * The save ladder. Each rung is tried in order and the whole thing is
     * incapable of throwing — a failed write degrades the feature, never the
     * chat.
     */
    function put(conv) {
      if (degraded === "unavailable" || degraded === "future-schema" || degraded === "quota") {
        return { ok: false, degraded: degraded };
      }

      var idx = readIndex();
      var forkedTo = null;

      /* Another tab may have moved this conversation on since we loaded it.
         Blindly overwriting would delete answers the user can see in the
         other tab, so fork instead: same transcript, new id, and this tab
         follows the fork. Costs one extra read per save. */
      var stored = readJSON(convKey(conv.id));
      if (stored && versionOk(stored)) {
        var lastSeen = seenVersion[conv.id] || 0;
        if ((stored.updatedAt || 0) > lastSeen &&
            (stored.messages || []).length > conv.messages.length) {
          conv = cloneInto(conv, newId());
          forkedTo = conv.id;
          idx = readIndex();
        }
      }

      var attempts = 0;
      while (attempts < 8) {
        attempts++;
        var body = JSON.stringify(conv);
        try {
          rawSet(convKey(conv.id), body);
          var pos = findEntry(idx, conv.id);
          var entry = {
            id: conv.id,
            title: conv.title,
            titleAuto: conv.titleAuto !== false,
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt,
            surface: conv.surface,
            turns: countTurns(conv.messages),
            bytes: bytesOf(body),
            hasAttachments: !!conv.attachmentsExpireAt,
            ratingDone: !!conv.ratingDone
          };
          if (pos === -1) idx.items.push(entry); else idx.items[pos] = entry;
          writeIndex(idx);
          seenVersion[conv.id] = conv.updatedAt;

          // Over the byte budget even though the write landed — trim the tail
          // for next time rather than waiting for a hard failure.
          if (totalBytes(idx) > MAX_TOTAL_BYTES) evictOldest(idx, conv.id);
          return { ok: true, forkedTo: forkedTo, id: conv.id };
        } catch (e) {
          if (!isQuotaError(e)) { degraded = "unavailable"; return { ok: false, degraded: degraded }; }
          if (attempts === 1 && slim(conv)) continue;      // rung 2
          if (evictOldest(idx, conv.id)) continue;         // rung 3
          degraded = "quota";                              // rung 4: give up quietly
          return { ok: false, degraded: degraded };
        }
      }
      degraded = "quota";
      return { ok: false, degraded: degraded };
    }

    function cloneInto(conv, id) {
      var copy = {};
      for (var k in conv) {
        if (Object.prototype.hasOwnProperty.call(conv, k)) copy[k] = conv[k];
      }
      copy.id = id;
      return copy;
    }

    function evictOldest(idx, protectId) {
      for (var i = idx.items.length - 1; i >= 0; i--) {
        if (idx.items[i].id === protectId) continue;
        rawDel(convKey(idx.items[i].id));
        idx.items.splice(i, 1);
        try { writeIndex(idx); } catch (e) {}
        return true;
      }
      return false;
    }

    return {
      sweep: sweep,

      list: function () {
        var idx = readIndex();
        return idx.items.slice();
      },

      /* Read without claiming to have loaded it. save() needs the stored
         metadata (createdAt, a manual title) but must NOT mark this tab as
         up to date, or a concurrent write from another tab would look like
         our own and the conflict check below would never fire. */
      peek: function (id) {
        var conv = readJSON(convKey(id));
        return (conv && versionOk(conv)) ? conv : null;
      },

      get: function (id) {
        var conv = readJSON(convKey(id));
        if (!conv || !versionOk(conv)) return null;
        seenVersion[id] = conv.updatedAt || 0;
        return conv;
      },

      put: put,

      del: function (id) {
        rawDel(convKey(id));
        var idx = readIndex();
        var pos = findEntry(idx, id);
        if (pos !== -1) {
          idx.items.splice(pos, 1);
          try { writeIndex(idx); } catch (e) {}
        }
        delete seenVersion[id];
        return true;
      },

      clearAll: function () {
        var idx = readIndex();
        for (var i = 0; i < idx.items.length; i++) rawDel(convKey(idx.items[i].id));
        rawDel(INDEX_KEY);
        seenVersion = {};
        return true;
      }
    };
  }

  function newId() {
    try {
      if (root.crypto && root.crypto.randomUUID) return root.crypto.randomUUID();
    } catch (e) {}
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // ── public API ───────────────────────────────────────────────────────────

  var backend = null;
  var cfg = { surface: "fullpage", sessionKey: "gk_conv" };
  var subscribers = [];
  var forkListeners = [];
  var pendingSave = null;
  var saveTimer = null;
  var started = false;

  function emit() {
    for (var i = 0; i < subscribers.length; i++) {
      try { subscribers[i](); } catch (e) {}
    }
  }

  function probe() {
    try {
      var s = store();
      if (!s) return false;
      s.setItem(PROBE_KEY, "1");
      var ok = s.getItem(PROBE_KEY) === "1";
      s.removeItem(PROBE_KEY);
      return ok;
    } catch (e) { return false; }
  }

  function flushSave() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    if (!pendingSave || !backend) return null;
    var conv = pendingSave;
    var wantedId = conv.id;
    pendingSave = null;
    var res = backend.put(conv);
    /* The write forked around another tab. The surface has to follow it, or
       its next turn would keep writing under an id that is no longer its
       own — and the server-side turn log would stitch the two tabs together. */
    if (res && res.forkedTo && res.forkedTo !== wantedId) {
      for (var i = 0; i < forkListeners.length; i++) {
        try { forkListeners[i](wantedId, res.forkedTo); } catch (e) {}
      }
    }
    emit();
    return res;
  }

  var api = {
    SCHEMA_V: SCHEMA_V,

    /** Idempotent. `sessionKey` is the surface's existing sessionStorage
     *  conversation-id key, which keeps its old per-tab meaning. */
    init: function (opts) {
      if (started) return api;
      started = true;
      opts = opts || {};
      if (opts.surface) cfg.surface = opts.surface;
      if (opts.sessionKey) cfg.sessionKey = opts.sessionKey;
      if (!probe()) { degraded = "unavailable"; return api; }
      backend = makeLocalBackend();
      try { backend.sweep(); } catch (e) {}
      try {
        root.addEventListener("storage", function (e) {
          if (!e || (e.key && e.key !== INDEX_KEY)) return;
          emit();
        });
        // A save still queued when the tab goes away would otherwise be lost.
        // pagehide, not beforeunload — the latter frequently never fires on
        // iOS Safari, the same reason gk-track.js flushes there.
        root.addEventListener("pagehide", function () { flushSave(); });
      } catch (e) {}
      return api;
    },

    available: function () { return !!backend && !degraded; },
    degraded: function () { return degraded; },

    stats: function () {
      if (!backend) return { count: 0, degraded: degraded };
      return { count: backend.list().length, degraded: degraded };
    },

    list: function () {
      if (!backend) return Promise.resolve([]);
      var items = backend.list();
      var out = [];
      for (var i = 0; i < items.length; i++) {
        out.push({
          id: items[i].id,
          title: items[i].title,
          turns: items[i].turns,
          surface: items[i].surface,
          updatedAt: items[i].updatedAt,
          createdAt: items[i].createdAt,
          when: relativeTime(items[i].updatedAt)
        });
      }
      return Promise.resolve(out);
    },

    /** Resolves to hydrated live state, or null. */
    get: function (id) {
      if (!backend || !id) return Promise.resolve(null);
      var conv = backend.get(id);
      return Promise.resolve(conv ? hydrate(conv) : null);
    },

    /**
     * Record a turn. Debounced and coalesced per call, fire-and-forget.
     * `state` is {id, surface, messages, feedbackState, ratingDone}.
     * A conversation with no user turn yet is never written, so the list
     * never fills with empty threads.
     */
    save: function (state) {
      if (!backend || !state || !state.id) return;
      var messages = serializeMessages(state.messages);
      if (!countTurns(messages)) return;

      var existing = backend.peek(state.id);
      var conv = {
        v: SCHEMA_V,
        id: state.id,
        surface: state.surface || cfg.surface,
        createdAt: (existing && existing.createdAt) || now(),
        updatedAt: now(),
        title: (existing && existing.titleAuto === false) ? existing.title : deriveTitle(messages),
        titleAuto: existing ? existing.titleAuto !== false : true,
        ratingDone: !!state.ratingDone || !!(existing && existing.ratingDone),
        messages: messages,
        feedback: serializeFeedback(state.feedbackState)
      };

      /* Extended by every new upload, so the window tracks the most recent
         file rather than the first. */
      if (hasAttachments(messages)) {
        conv.attachmentsExpireAt = (existing && existing.attachmentsExpireAt &&
          existing.attachmentsExpireAt > now())
          ? existing.attachmentsExpireAt
          : now() + UPLOAD_TTL_MS;
      }

      pendingSave = conv;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(flushSave, SAVE_DEBOUNCE_MS);
    },

    /** Force any queued write out now (used before navigating away). */
    flush: function () { return flushSave(); },

    rename: function (id, title) {
      if (!backend || !id) return Promise.resolve(false);
      var conv = backend.peek(id);
      if (!conv) return Promise.resolve(false);
      conv.title = String(title || "").replace(/\s+/g, " ").slice(0, 120) || conv.title;
      conv.titleAuto = false;
      conv.updatedAt = conv.updatedAt || now();
      var res = backend.put(conv);
      emit();
      return Promise.resolve(!!res.ok);
    },

    remove: function (id) {
      if (!backend || !id) return Promise.resolve(false);
      if (pendingSave && pendingSave.id === id) {
        pendingSave = null;
        if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
      }
      backend.del(id);
      emit();
      return Promise.resolve(true);
    },

    clear: function () {
      if (!backend) return Promise.resolve();
      pendingSave = null;
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
      backend.clearAll();
      emit();
      return Promise.resolve();
    },

    // ── active conversation pointer (synchronous on purpose) ──────────────

    activeId: function () {
      try { return root.sessionStorage.getItem(cfg.sessionKey) || null; } catch (e) { return null; }
    },

    setActive: function (id) {
      try {
        if (id) root.sessionStorage.setItem(cfg.sessionKey, id);
        else root.sessionStorage.removeItem(cfg.sessionKey);
      } catch (e) {}
    },

    newId: newId,

    // ── UI preferences ────────────────────────────────────────────────────

    ui: function (patch) {
      var cur = readJSON(UI_KEY) || {};
      if (!patch) return cur;
      for (var k in patch) {
        if (Object.prototype.hasOwnProperty.call(patch, k)) cur[k] = patch[k];
      }
      try { rawSet(UI_KEY, JSON.stringify(cur)); } catch (e) {}
      return cur;
    },

    // ── helpers shared by both surfaces ───────────────────────────────────

    /** Notified as (oldId, newId) when a save had to fork around another tab. */
    onFork: function (fn) {
      if (typeof fn === "function") forkListeners.push(fn);
    },

    subscribe: function (fn) {
      if (typeof fn !== "function") return function () {};
      subscribers.push(fn);
      return function () {
        for (var i = 0; i < subscribers.length; i++) {
          if (subscribers[i] === fn) { subscribers.splice(i, 1); return; }
        }
      };
    },

    relativeTime: relativeTime,
    restoredThread: restoredThread,
    deriveTitle: deriveTitle
  };

  root.GKHistory = api;

  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
