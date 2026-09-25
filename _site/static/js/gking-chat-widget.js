/*!
 * Gary King Chat Widget — embeddable chat launcher
 *
 * Usage:
 *   <script src="https://your-host/gking-chat-widget.js"
 *           data-api-url="https://your-api.example.com/chat"
 *           data-bot-id="gking"
 *           data-bot-name="GaryAI"
 *           data-welcome-message="Hello, I'm Gary King..."
 *           data-avatar-label="GK"
 *           data-avatar-url="https://your-host/garyai-avatar.png"
 *           data-input-placeholder="Ask me about my research..."
 *           defer></script>
 *
 * Or configure via window.GKingChatConfig before loading the script:
 *   <script>
 *     window.GKingChatConfig = { apiUrl: "https://your-api.example.com/chat" };
 *   </script>
 *   <script src="https://your-host/gking-chat-widget.js" defer></script>
 *
 * Programmatic control after load:
 *   window.GKingChat.open();
 *   window.GKingChat.close();
 *   window.GKingChat.toggle();
 *   window.GKingChat.reset();
 */
(function () {
  "use strict";

  var WIDGET_VERSION = "1.12.0";

  var PIXEL_URL = "https://ueczzuogsj2hnfdr7gwfwuh5sa0oozkm.lambda-url.us-east-2.on.aws/";

  // Capture currentScript synchronously (null-safe inside async callbacks).
  var scriptEl = document.currentScript;

  // ── Analytics ───────────────────────────────────────────────────────────
  // gk-track.js is loaded from the same directory this widget was served from,
  // so an embed on any host still gets it. It writes nothing to the device
  // (the visitor id is derived server-side from a rotating salt), which is why
  // there is no consent gate. Until it loads — or if it never does — T is a
  // no-op and the widget behaves exactly as before.
  var T = {
    track: function () {}, trackOnce: function () {}, setConversationId: function () {},
    noteMessageSent: function () {}, noteAnswerReceived: function () {},
    bindComposer: function () {}, bindAnswerLinks: function () {},
    trackAnswerDwell: function () {}, flush: function () {},
    clientContext: function () { return undefined; }
  };
  var trackerReady = false;
  var trackerPending = [];
  var loadedAt = Date.now();
  // Mirrors init()'s conversationId at module scope so the tracker (loaded
  // asynchronously, outside init's closure) can pick it up.
  var currentConversationId = null;

  (function loadTracker() {
    try {
      var src = (scriptEl && scriptEl.src) || "";
      var base = src ? src.replace(/[^/]*$/, "") : "";
      if (!base) return;
      var s = document.createElement("script");
      s.src = base + "gk-track.js";
      s.async = true;
      s.onload = function () {
        if (!window.GKTrack) return;
        T = window.GKTrack.init({ endpoint: PIXEL_URL, surface: "embed" });
        trackerReady = true;
        if (currentConversationId) T.setConversationId(currentConversationId);
        // Replay anything that happened while the script was in flight —
        // widget_impression in particular fires before it can have loaded.
        for (var i = 0; i < trackerPending.length; i++) {
          T.track(trackerPending[i][0], trackerPending[i][1]);
        }
        trackerPending = [];
      };
      (document.head || document.documentElement).appendChild(s);
    } catch (e) {}
  })();

  // KaTeX is vendored next to this script (js/katex/). Loaded lazily so a page
  // that never opens the chat pays nothing for it.
  var katexRequested = false;
  var katexOnReady = null;
  function loadKatex() {
    if (katexRequested) return;
    katexRequested = true;
    try {
      var src = (scriptEl && scriptEl.src) || "";
      var base = src ? src.replace(/[^/]*$/, "") : "";
      if (!base) return;
      var cssHref = base + "katex/katex.min.css";
      // @font-face declared inside a shadow root is ignored by Chrome/Safari,
      // so the face definitions have to live in the document. Everything else
      // (the .katex rules) goes in the shadow root next to the widget styles.
      if (!document.querySelector('link[data-gk-katex-fonts]')) {
        var fl = document.createElement("link");
        fl.rel = "stylesheet";
        fl.href = base + "katex/katex-fonts.css";
        fl.setAttribute("data-gk-katex-fonts", "1");
        (document.head || document.documentElement).appendChild(fl);
      }
      katexCssHref = cssHref;
      if (shadowRootEl) injectKatexCss(shadowRootEl);
      var s = document.createElement("script");
      s.src = base + "katex/katex.min.js";
      s.async = true;
      s.onload = function () { if (katexOnReady) katexOnReady(); };
      (document.head || document.documentElement).appendChild(s);
    } catch (e) {}
  }

  var katexCssHref = "";
  var shadowRootEl = null;
  function injectKatexCss(root) {
    if (!katexCssHref || !root || root.querySelector("link[data-gk-katex]")) return;
    var l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = katexCssHref;
    l.setAttribute("data-gk-katex", "1");
    root.appendChild(l);
  }

  // Step thread state machine, loaded from the same directory as this script.
  // Eager (not deferred to first open like KaTeX) because a step event can
  // arrive seconds after the page loads, but never blocking: if it fails to
  // load, window.GKSteps stays undefined and every call site below no-ops, so
  // the chat works exactly as it did before the step thread existed.
  (function loadSteps() {
    try {
      var src = (scriptEl && scriptEl.src) || "";
      var base = src ? src.replace(/[^/]*$/, "") : "";
      if (!base) return;
      var s = document.createElement("script");
      s.src = base + "gk-steps.js";
      s.async = true;
      (document.head || document.documentElement).appendChild(s);
    } catch (e) {}
  })();

  /* Conversation history (js/gk-history.js), loaded the same way. Deferred to
     the first panel open rather than eager like gk-steps: this widget mounts
     on every page of the site and nothing here is needed until someone
     actually opens the chat. If it never loads, historyReady stays false,
     the header button stays hidden, and the widget behaves exactly as 1.8.0
     did — the transcript simply isn't recorded. */
  var HIST = null;
  var historyRequested = false;
  var historyOnReady = null;
  function loadHistory() {
    if (historyRequested) return;
    historyRequested = true;
    try {
      var src = (scriptEl && scriptEl.src) || "";
      var base = src ? src.replace(/[^/]*$/, "") : "";
      if (!base) return;
      var s = document.createElement("script");
      s.src = base + "gk-history.js";
      s.async = true;
      s.onload = function () {
        if (!window.GKHistory) return;
        HIST = window.GKHistory.init({ surface: "embed", sessionKey: "gk_conv_widget" });
        if (!HIST.available()) { HIST = null; return; }
        if (historyOnReady) historyOnReady();
      };
      (document.head || document.documentElement).appendChild(s);
    } catch (e) {}
  }

  /** Queue-aware wrapper: safe to call before gk-track.js has loaded. */
  function track(name, props) {
    if (trackerReady) T.track(name, props);
    else if (trackerPending.length < 30) trackerPending.push([name, props || {}]);
  }

  // Legacy raw beacon, kept as the floor: if gk-track.js is blocked by a host
  // CSP we still record that the widget was opened.
  var pixelFired = false;
  function firePixel(tracker) {
    if (pixelFired) return;
    pixelFired = true;
    try {
      var u = encodeURIComponent(location.host + location.pathname);
      var r = encodeURIComponent(document.referrer || "");
      new Image().src = PIXEL_URL + "?t=" + tracker + "&u=" + u + "&r=" + r + "&_=" + Date.now();
    } catch (e) {}
  }

  function uuid() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function readConfig() {
    var userConfig = window.GKingChatConfig || {};
    var dataConfig = {};
    if (scriptEl && scriptEl.dataset) {
      var d = scriptEl.dataset;
      if (d.apiUrl) dataConfig.apiUrl = d.apiUrl;
      if (d.feedbackUrl) dataConfig.feedbackUrl = d.feedbackUrl;
      if (d.botId) dataConfig.botId = d.botId;
      if (d.botName) dataConfig.botName = d.botName;
      if (d.welcomeMessage) dataConfig.welcomeMessage = d.welcomeMessage;
      if (d.avatarLabel) dataConfig.avatarLabel = d.avatarLabel;
      if (d.avatarUrl) dataConfig.avatarUrl = d.avatarUrl;
      if (d.inputPlaceholder) dataConfig.inputPlaceholder = d.inputPlaceholder;
    }
    var defaults = {
      apiUrl: "",
      feedbackUrl: "",
      botId: "gking",
      botName: "GaryAI",
      welcomeMessage:
        "This is Gary King's AI chatbot. How can I help?",
      avatarLabel: "GK",
      // Gary's picture ships next to this script, so it resolves on any host
      // that embeds the widget. avatarLabel is its alt text.
      avatarUrl: scriptEl && scriptEl.src ? scriptEl.src.replace(/[^/]*$/, "") + "garyai-avatar.png" : "",
      inputPlaceholder: "Ask me about my research..."
    };
    return Object.assign({}, defaults, userConfig, dataConfig);
  }

  function deriveFeedbackUrl(cfg) {
    if (cfg.feedbackUrl) return cfg.feedbackUrl;
    if (!cfg.apiUrl) return "";
    if (/\/chat\/?$/.test(cfg.apiUrl)) return cfg.apiUrl.replace(/\/chat(\/?)$/, "/feedback$1");
    return cfg.apiUrl.replace(/\/?$/, "") + "/feedback";
  }

  var FONT = "'Helvetica Neue', Arial, sans-serif";
  var USER_ICON_SVG =
    '<svg class="avatar-user" viewBox="0 0 26 26" aria-hidden="true">' +
    '<rect width="26" height="26" fill="#7d8ba1"/>' +
    '<g fill="#fff"><circle cx="13" cy="9.1" r="4.2"/><ellipse cx="13" cy="22.2" rx="8.8" ry="7.5"/></g>' +
    "</svg>";
  var CSS = [
    // Match the chatbot (static/index.html + Next.js `antialiased` body) by
    // pinning the same font stack AND the same smoothing hints inside the
    // shadow DOM. `all: initial` strips inheritance, so re-declare smoothing
    // here or fonts render slightly bolder than the chatbot on macOS.
    ":host { all: initial; font-family: " + FONT + "; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility; }",
    // Force the font on every descendant — UA stylesheets reset font-family on form controls.
    ":host, button, input, textarea, select { font-family: " + FONT + " !important; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }",
    // …but not inside a formula. KaTeX picks a specific math face per glyph
    // (KaTeX_Math for variables, KaTeX_Size* for stretchy delimiters, …) and
    // positions everything from those metrics, so forcing the UI font here
    // silently wrecks the layout it just computed. Split out from the rule
    // above so an engine without complex :not() drops only this half and the
    // widget still inherits its font from :host.
    ":host *:not(.katex):not(.katex *) { font-family: " + FONT + " !important; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }",
    "* { box-sizing: border-box; }",
    // The launcher badge's palette, reused by all the chrome: a pale
    // #edf2f8 body, a white-to-slate rim, slate text. A gradient border is
    // drawn as a second background clipped to the border box, which (unlike
    // border-image) keeps the radius.
    ":host {",
    "  --gk-badge: linear-gradient(160deg, #f8fafd 0%, #edf2f8 50%, #bfcbdc 100%);",
    "  --gk-rim: linear-gradient(135deg, #ffffff 0%, #94a3b9 45%, #56657d 100%);",
    "  --gk-ink: linear-gradient(180deg, #5d6c86 0%, #333f55 100%);",
    "  --gk-slate: #46546b;",
    "  --gk-slate-deep: #333f55;",
    "  --gk-line: #d3dbe7;",
    "}",
    // Launcher: a light #edf2f8 speech bubble reading "GaryAI" in a
    // tone-on-tone blue-grey, with a white-to-blue-grey rim, a gloss line and
    // a soft cool-grey shadow. The button is transparent; the SVG
    // canvas leaves room for the shadow, hence 88px for a ~72px bubble.
    ".btn {",
    "  position: fixed; right: 14px; bottom: 12px;",
    "  width: 88px; height: 88px; padding: 0;",
    "  border: none; background: transparent; cursor: pointer;",
    "  color: #1a1a1a;",
    "  display: flex; align-items: center; justify-content: center;",
    "  z-index: 2147483000;",
    "  transition: transform 0.15s ease;",
    "  -webkit-tap-highlight-color: transparent;",
    "}",
    ".btn:active { transform: scale(0.94); }",
    ".btn .icon-chat { position: relative; display: block; width: 100%; height: 100%; }",
    ".btn .bubble-svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }",
    // Open: a clean X in a small white disc with a soft grey glow.
    ".btn .icon-close {",
    "  width: 48px; height: 48px; padding: 13px; box-sizing: border-box;",
    "  color: var(--gk-slate-deep); border-radius: 50%; border: 1.5px solid transparent;",
    "  background: var(--gk-badge) padding-box, var(--gk-rim) border-box;",
    "  box-shadow: 0 3px 9px rgba(93,107,130,0.42);",
    "}",
    ":host .btn .bubble-svg text { font-family: ui-sans-serif, system-ui, sans-serif !important; }",
    ".panel {",
    "  position: fixed; right: 24px; bottom: 100px;",
    "  width: min(380px, calc(100vw - 32px));",
    "  height: min(560px, calc(100vh - 140px));",
    "  border-radius: 16px;",
    "  border: 1px solid var(--gk-line);",
    "  background: #fff;",
    "  box-shadow: 0 18px 50px rgba(0,0,0,0.34), 0 2px 8px rgba(0,0,0,0.16);",
    "  display: flex; flex-direction: column; overflow: hidden;",
    "  z-index: 2147483001;",
    "  color: #333333;",
    "}",
    ".panel[hidden] { display: none; }",
    ".panel.fullscreen {",
    "  top: 0; left: 0; right: 0; bottom: 0;",
    "  width: 100%; height: 100%;",
    "  border-radius: 0; border: none; background: #fff;",
    "  box-shadow: none;",
    "}",
    // Everything follows the launcher badge's pale blue-grey and slate: the
    // header is white over a thin blue-grey rule with the name in the badge's
    // slate text gradient.
    // The header is the name alone; Gary's picture sits beside his bubbles.
    ".header {",
    "  padding: 12px 16px;",
    "  background: #fff;",
    "  color: var(--gk-slate-deep);",
    "  border-bottom: 1px solid #94a3b9;",
    "  display: flex; align-items: center; gap: 10px;",
    "}",
    ".header .title { flex: 1; min-width: 0; }",
    // "GaryAI" everywhere uses the site nav's font (the "Bio & C.V." links).
    ".header .name {",
    "  font-size: 16px; font-weight: 600; line-height: 1.2; letter-spacing: 0.02em;",
    "  color: transparent; background: var(--gk-ink);",
    "  -webkit-background-clip: text; background-clip: text;",
    "}",
    ":host .header .name { font-family: ui-sans-serif, system-ui, sans-serif !important; }",
    ".header .status { font-size: 11px; color: #666666; margin-top: 2px; }",
    ".header .status-dot {",
    "  display: inline-block; width: 6px; height: 6px; border-radius: 50%;",
    "  background: #1bbc9d; margin-right: 6px; vertical-align: middle;",
    "}",
    ".header .close, .header .expand, .header .minimize, .header .hist-btn {",
    "  background: transparent; border: none; color: #333333;",
    "  opacity: 0.9; cursor: pointer; padding: 4px; display: flex;",
    "}",
    ".header .close:hover, .header .expand:hover, .header .minimize:hover, .header .hist-btn:hover { opacity: 1; }",
    ".messages {",
    "  flex: 1; overflow-y: auto;",
    "  padding: 14px 14px 6px;",
    "  display: flex; flex-direction: column; gap: 12px;",
    "  background: #f3f6fb;",
    "}",
    ".msg { display: flex; gap: 8px; align-items: flex-start; }",
    // User turns: time stamp above a right-aligned bubble, user icon at the
    // bubble's bottom edge. Gary's turns: his picture beside a white bubble.
    ".msg.user { justify-content: flex-end; align-items: flex-end; }",
    ".msg.user .ucol { display: flex; flex-direction: column; align-items: flex-end; max-width: 82%; min-width: 0; }",
    ".msg.user .ucol .bubble { max-width: 100%; }",
    ".msg-time { font-size: 11px; color: #888888; margin: 0 2px 3px 0; }",
    ".avatar-sm {",
    "  width: 26px; height: 26px; border-radius: 50%;",
    "  display: block; flex-shrink: 0; margin-top: 2px; object-fit: cover;",
    "}",
    ".avatar-user { width: 26px; height: 26px; flex-shrink: 0; display: block; border-radius: 50%; overflow: hidden; }",
    ".bubble {",
    "  max-width: 82%;",
    "  padding: 9px 12px;",
    "  font-size: 14px; line-height: 1.85;",
    "  font-family: " + FONT + ";",
    "  word-break: break-word;",
    "  white-space: pre-wrap;",
    "}",
    ".msg.user .bubble {",
    "  border-radius: 14px 14px 4px 14px;",
    "  background: #e3e9f2; color: #333333;",
    "}",
    ".msg.bot .bubble {",
    "  border-radius: 14px 14px 14px 4px;",
    "  background: #fff; color: #333333;",
    "  border: 1px solid var(--gk-line);",
    "}",
    ".bubble strong { color: #000000; font-weight: 700; }",
    ".bubble code {",
    "  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;",
    "  background: #f7f7f7; border: 1px solid #dcdcdc; border-radius: 4px;",
    "  padding: 1px 5px; font-size: 0.92em; color: #000000;",
    "}",
    ".bubble a { color: #286ed0; text-decoration: underline; }",
    // ── Step thread ────────────────────────────────────────────────────────
    // One line per tool call while the answer is being worked out. Colour is
    // used for exactly one thing here: the step happening right now.
    ".thread { list-style: none; margin: 0 0 10px; padding: 0; }",
    ".thread-step {",
    "  display: flex; align-items: baseline; gap: 8px;",
    "  font-size: 12.5px; line-height: 1.6; color: #666666;",
    "  animation: gkRise 200ms ease-out;",
    "}",
    ".thread-dot {",
    "  width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;",
    "  background: #aaaaaa; transform: translateY(-1px);",
    "}",
    ".thread-step.is-live { color: #000000; }",
    ".thread-step.is-live .thread-dot {",
    "  background: #000000;",
    "  animation: gkBreathe 1.8s ease-in-out infinite;",
    "}",
    ".thread-summary {",
    "  display: block; margin: 0 0 10px; padding: 0;",
    "  background: none; border: none; cursor: pointer;",
    "  font-family: inherit; font-size: 12.5px; color: #aaaaaa;",
    "  transition: color 140ms ease;",
    "}",
    ".thread-summary:hover { color: #666666; }",
    // Dots on top, caption underneath. align-items keeps the dots bubble from
    // stretching to the caption's width.
    ".wait-stack { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }",
    ".waiting {",
    "  font-size: 12.5px; color: #666666; padding: 1px 4px;",
    "  animation: gkRise 200ms ease-out;",
    "}",
    "@keyframes gkBreathe {",
    "  0%, 100% { box-shadow: 0 0 0 0 rgba(0,0,0, 0.40); }",
    "  50% { box-shadow: 0 0 0 5px rgba(0,0,0, 0); }",
    "}",
    "@keyframes gkRise {",
    "  from { opacity: 0; transform: translateY(4px); }",
    "}",
    // Motion is decoration here — every state the animations convey is also
    // carried by text and colour, so switching them off costs nothing.
    "@media (prefers-reduced-motion: reduce) {",
    "  *, *::before, *::after {",
    "    animation-duration: 0.01ms !important;",
    "    animation-iteration-count: 1 !important;",
    "    transition-duration: 0.01ms !important;",
    "  }",
    "}",
    // KaTeX lays out with normal whitespace handling; the bubble's pre-wrap
    // would otherwise stretch every space inside a formula.
    ".bubble .katex { white-space: normal; font-size: 1.05em; }",
    ".bubble .katex-display {",
    "  margin: 0.5em 0; padding: 2px 0;",
    "  overflow-x: auto; overflow-y: hidden;",
    "}",
    ".bubble .katex-display > .katex { white-space: nowrap; font-size: 0.98em; }",
    // A cases block or a long equation doesn't fit the default bubble width in
    // a 360px panel. Let a bubble that holds one use the full column; the
    // overflow-x above stays as the fallback for whatever is still too wide
    // (and for engines without :has(), where this rule simply drops).
    ".msg.bot .bubble:has(.katex-display) { max-width: 97%; }",
    ".typing {",
    "  background: #fff; border: 1px solid #dcdcdc;",
    "  border-radius: 14px 14px 14px 4px;",
    "  padding: 10px 14px; display: flex; gap: 4px;",
    "}",
    ".typing span {",
    "  width: 6px; height: 6px; border-radius: 50%;",
    "  background: #000000; animation: gkingPulse 1.2s infinite;",
    "}",
    ".typing span:nth-child(2) { animation-delay: 120ms; }",
    ".typing span:nth-child(3) { animation-delay: 240ms; }",
    "@keyframes gkingPulse {",
    "  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }",
    "  30% { transform: translateY(-3px); opacity: 1; }",
    "}",
    ".input-row {",
    "  padding: 12px; background: #fff;",
    "  border-top: 1px solid #e3e9f2;",
    "  display: flex; gap: 8px; align-items: flex-end;",
    "}",
    ".input-row textarea {",
    "  flex: 1; resize: none;",
    "  border: 1px solid var(--gk-line); border-radius: 10px;",
    "  padding: 9px 12px; font-size: 14px;",
    "  font-family: 'Helvetica Neue', Arial, sans-serif;",
    "  color: #333333; outline: none;",
    "  max-height: 120px; line-height: 1.4;",
    "}",
    ".input-row textarea:focus { border-color: #94a3b9; }",
    // Send: flat slate with a white icon (no gloss, rim or shadow).
    ".input-row .send {",
    "  width: 38px; height: 38px; border-radius: 50%; border: none;",
    "  background: var(--gk-slate); color: #fff; cursor: pointer;",
    "  display: flex; align-items: center; justify-content: center; flex-shrink: 0;",
    "  transition: background 0.15s;",
    "}",
    ".input-row .send:hover:not(:disabled) { background: var(--gk-slate-deep); }",
    // Idle (nothing typed): flat pale blue-grey, so the live state reads as "on".
    ".input-row .send:disabled { background: var(--gk-line); color: #fff; cursor: not-allowed; }",
    ".input-row .send.stop { cursor: pointer; }",
    // Attach button. Unlike the full-page pill, .input-row has no overflow:hidden,
    // so this drops in with no cap-radius treatment needed.
    ".input-row .attach {",
    "  width: 34px; height: 38px; border: none; background: transparent;",
    "  color: #aaaaaa; cursor: pointer; flex-shrink: 0;",
    "  display: flex; align-items: center; justify-content: center;",
    "}",
    ".input-row .attach:hover { color: #000000; }",
    ".input-row .attach[hidden] { display: none; }",
    // Chips sit above the input row, outside .messages — which is rebuilt
    // wholesale every animation frame while streaming.
    ".chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 12px 0; }",
    ".chips:empty { display: none; }",
    // Upload rejections. The red chip alone is easy to miss and clips its text,
    // so the reason is repeated here in full until dismissed.
    ".upload-err {",
    "  display: none; align-items: flex-start; gap: 6px;",
    "  margin: 8px 12px 0; padding: 7px 9px;",
    "  background: #fdf5f5; border: 1px solid #e6c3c1; border-radius: 9px;",
    "  font-size: 11px; line-height: 1.45; color: #8c3b36;",
    "}",
    ".upload-err.show { display: flex; }",
    // Non-fatal note (e.g. a scanned PDF) — same slot, amber not red, because
    // the file was accepted and nothing needs fixing.
    ".upload-err.warn { background: #fdfaf2; border-color: #e8dcc0; color: #7a5c1e; }",
    ".upload-err.warn .upload-err-x { color: #c2a86a; }",
    ".upload-err.warn .upload-err-x:hover { color: #7a5c1e; }",
    ".upload-err-text { flex: 1; }",
    ".upload-err-x { background: none; border: none; cursor: pointer; color: #c08a86; font-size: 14px; line-height: 1; padding: 0 2px; flex-shrink: 0; }",
    ".upload-err-x:hover { color: #8c3b36; }",
    ".chip {",
    "  display: flex; align-items: center; gap: 6px;",
    "  background: #f5f5f5; border: 1px solid #dcdcdc; border-radius: 9px;",
    "  padding: 5px 6px 5px 8px; font-size: 11px; color: #333333;",
    "  max-width: 200px; position: relative; overflow: hidden;",
    "}",
    ".chip.error { border-color: #e6c3c1; background: #fdf5f5; }",
    ".chip-icon { flex-shrink: 0; }",
    ".chip-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; }",
    ".chip-meta { color: #666666; white-space: nowrap; font-size: 10px; }",
    ".chip-x { background: none; border: none; cursor: pointer; color: #aaaaaa; font-size: 14px; line-height: 1; padding: 0 2px; }",
    ".chip-x:hover { color: #c45a55; }",
    ".chip-bar { position: absolute; left: 0; bottom: 0; height: 2px; background: #000000; transition: width 0.2s; }",
    ".bubble .chips { padding: 0 0 6px; }",
    ".bubble .chip { background: #fff; border-color: #dcdcdc; color: inherit; max-width: 100%; }",
    ".bubble .chip-meta { color: inherit; opacity: 0.75; }",
    ".panel.dragging { outline: 2px dashed #000000; outline-offset: -4px; }",
    ".feedback-row {",
    "  display: flex; gap: 4px; align-items: center;",
    "  margin: 4px 0 0 34px;",
    "}",
    ".feedback-btn {",
    "  background: transparent; border: none; cursor: pointer;",
    "  padding: 4px; border-radius: 6px; line-height: 0;",
    "  color: #888888; transition: background 0.15s ease, color 0.15s ease;",
    "}",
    ".feedback-btn.up:hover:not(:disabled) { background: #e6f7f0; color: #2bb673; }",
    ".feedback-btn.down:hover:not(:disabled) { background: #fdeceb; color: #e15554; }",
    ".feedback-btn.up.active { color: #2bb673; }",
    ".feedback-btn.down.active { color: #e15554; }",
    ".feedback-btn:disabled { cursor: default; }",
    ".feedback-btn.active:disabled { opacity: 1; }",
    ".feedback-thanks { font-size: 11px; color: #888888; margin-left: 4px; }",
    ".feedback-comment {",
    "  margin: 6px 0 0 34px;",
    "  display: flex; flex-direction: column; gap: 6px;",
    "  background: #fff; border: 1px solid #dcdcdc; border-radius: 10px;",
    "  padding: 8px;",
    "}",
    ".feedback-comment textarea {",
    "  border: none; outline: none; resize: vertical;",
    "  min-height: 48px; max-height: 120px;",
    "  font-family: 'Helvetica Neue', Arial, sans-serif;",
    "  font-size: 13px; color: #333333;",
    "}",
    ".feedback-comment .row {",
    "  display: flex; gap: 6px; justify-content: flex-end;",
    "}",
    ".feedback-comment button {",
    "  font-size: 12px; padding: 5px 10px; border-radius: 6px;",
    "  border: 1px solid #dcdcdc; background: #fff; color: #000000;",
    "  cursor: pointer; font-family: inherit;",
    "}",
    ".feedback-comment button.primary {",
    "  border: 1px solid transparent; color: #fff;",
    "  background: var(--gk-slate);",
    "}",
    ".session-rating {",
    "  position: relative;",
    "  margin: 8px auto 2px;",
    "  padding: 10px 30px 10px 14px;",
    "  background: #fff; border: 1px solid #dcdcdc; border-radius: 12px;",
    "  box-shadow: 0 2px 10px rgba(0,0,0,0.08);",
    "  display: flex; flex-direction: column; gap: 7px;",
    "  max-width: 100%;",
    "}",
    ".sr-question { font-size: 12px; color: #333333; font-weight: 600; }",
    ".sr-optional { font-weight: 400; color: #888888; }",
    ".sr-options { display: flex; gap: 5px; flex-wrap: wrap; }",
    ".sr-options button {",
    "  font-size: 12px; padding: 5px 10px; border-radius: 999px;",
    "  border: 1px solid #dcdcdc; background: #f7f7f7; color: #333333;",
    "  cursor: pointer; font-family: inherit;",
    "  transition: background 0.15s, border-color 0.15s;",
    "}",
    ".sr-options button:hover { background: #fff; border-color: #999999; }",
    ".sr-dismiss {",
    "  position: absolute; top: 5px; right: 7px;",
    "  background: transparent; border: none; cursor: pointer;",
    "  color: #aaaaaa; font-size: 12px; padding: 2px; line-height: 1;",
    "}",
    ".sr-dismiss:hover { color: #000000; }",
    ".sr-thanks { font-size: 12px; color: #888888; }",
    ".session-rating textarea {",
    "  border: 1px solid #dcdcdc; border-radius: 8px; outline: none; resize: vertical;",
    "  min-height: 40px; max-height: 120px; padding: 6px 8px;",
    "  font-family: 'Helvetica Neue', Arial, sans-serif;",
    "  font-size: 12px; color: #333333;",
    "}",
    ".sr-actions { display: flex; gap: 6px; justify-content: flex-end; }",
    ".sr-actions button {",
    "  font-size: 12px; padding: 4px 10px; border-radius: 6px;",
    "  border: 1px solid #dcdcdc; background: #fff; color: #000000;",
    "  cursor: pointer; font-family: inherit;",
    "}",
    ".sr-actions button.primary {",
    "  border: 1px solid transparent; color: #fff;",
    "  background: var(--gk-slate);",
    "}",
    ".footer {",
    "  padding: 6px 12px 8px; background: #fff;",
    "  border-top: 1px solid #efefef;",
    "  text-align: center;",
    "}",
    ".footer-text {",
    "  font-size: 11px; color: #888888; line-height: 1.4;",
    "}",
    ".footer-link {",
    "  background: transparent; border: none; cursor: pointer;",
    "  font-size: 11px; color: #888888; text-decoration: underline;",
    "  font-family: inherit; padding: 0;",
    "}",
    ".footer-link:hover { color: #000000; }",
    ".modal-overlay {",
    "  position: absolute; inset: 0;",
    "  background: rgba(0,0,0,0.35);",
    "  display: flex; align-items: center; justify-content: center;",
    "  padding: 16px; z-index: 10;",
    "}",
    ".modal-overlay[hidden] { display: none; }",
    ".modal {",
    "  background: #fff; border-radius: 12px; padding: 14px;",
    "  width: 100%; box-shadow: 0 8px 24px rgba(0,0,0,0.2);",
    "  display: flex; flex-direction: column; gap: 10px;",
    "}",
    ".modal h3 { margin: 0; font-size: 14px; color: #333333; font-weight: 700; }",
    ".modal p { margin: 0; font-size: 12px; color: #888888; }",
    ".modal textarea {",
    "  border: 1px solid #dcdcdc; border-radius: 8px; padding: 8px;",
    "  resize: vertical; min-height: 80px; max-height: 180px;",
    "  font-family: 'Helvetica Neue', Arial, sans-serif;",
    "  font-size: 13px; color: #333333; outline: none;",
    "}",
    ".modal .row { display: flex; gap: 8px; justify-content: flex-end; }",
    ".modal button {",
    "  font-size: 13px; padding: 6px 12px; border-radius: 8px;",
    "  border: 1px solid #dcdcdc; background: #fff; color: #000000;",
    "  cursor: pointer; font-family: inherit;",
    "}",
    ".modal button.primary {",
    "  border: 1px solid transparent; color: #fff;",
    "  background: var(--gk-slate);",
    "}",
    ".figures {",
    "  margin-top: 10px; padding-top: 8px;",
    "  border-top: 1px dashed #dcdcdc;",
    "  display: flex; flex-direction: column; gap: 8px;",
    "}",
    ".figures-label {",
    "  font-size: 9px; font-weight: 700; letter-spacing: 1.2px;",
    "  text-transform: uppercase; color: #888888;",
    "}",
    ".figure { display: flex; flex-direction: column; gap: 3px; }",
    ".figure a { display: block; line-height: 0; }",
    ".figure img {",
    "  display: block; width: 100%; height: auto;",
    "  max-height: 220px; object-fit: contain;",
    "  background: #f7f7f7;",
    "  border: 1px solid #dcdcdc; border-radius: 6px;",
    "  cursor: zoom-in;",
    "}",
    ".figure-caption {",
    "  font-size: 11px; color: #888888; font-style: italic;",
    "  line-height: 1.35; word-break: break-word;",
    "}",
    ".previews { margin-top: 14px; display: grid; gap: 10px; }",
    ".preview-card {",
    "  display: flex; align-items: stretch; gap: 12px;",
    "  padding: 10px; border: 1px solid #dcdcdc; border-radius: 8px;",
    "  background: #f7f7f7; text-decoration: none; color: #333333;",
    "  transition: border-color 120ms, background 120ms;",
    "}",
    ".preview-card:hover { border-color: #999999; background: #fff; }",
    ".preview-card-image {",
    "  flex: 0 0 auto; width: 80px; height: 80px;",
    "  object-fit: cover; border-radius: 6px;",
    "  border: 1px solid #dcdcdc; background: #fff;",
    "}",
    ".preview-card-favicon-wrap {",
    "  flex: 0 0 auto; width: 80px; height: 80px;",
    "  display: flex; align-items: center; justify-content: center;",
    "  border-radius: 6px; border: 1px solid #dcdcdc; background: #fff;",
    "}",
    ".preview-card-favicon { width: 48px; height: 48px; object-fit: contain; }",
    ".preview-card-body {",
    "  min-width: 0; display: flex; flex-direction: column; justify-content: center;",
    "}",
    ".preview-card-site {",
    "  font-size: 10px; font-weight: 700; letter-spacing: 1.2px;",
    "  text-transform: uppercase; color: #666666;",
    "  margin-bottom: 2px;",
    "  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;",
    "}",
    ".preview-card-title {",
    "  font-size: 13px; font-weight: 600; color: #000000; line-height: 1.3;",
    "  display: -webkit-box; -webkit-line-clamp: 2;",
    "  -webkit-box-orient: vertical; overflow: hidden;",
    "}",
    ".preview-card-desc {",
    "  font-size: 12px; color: #666666; line-height: 1.4; margin-top: 3px;",
    "  display: -webkit-box; -webkit-line-clamp: 2;",
    "  -webkit-box-orient: vertical; overflow: hidden;",
    "}",
    ".preview-card-thumb {",
    "  position: relative; flex: 0 0 auto; width: 80px; height: 80px;",
    "}",
    ".preview-card-play {",
    "  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);",
    "  width: 30px; height: 30px; border-radius: 50%;",
    "  background: rgba(200, 40, 40, 0.92); pointer-events: none;",
    "}",
    ".preview-card-play::after {",
    "  content: ''; position: absolute; top: 50%; left: 50%;",
    "  transform: translate(-40%, -50%);",
    "  border-style: solid; border-width: 6px 0 6px 10px;",
    "  border-color: transparent transparent transparent #fff;",
    "}",
    ".preview-card-ts {",
    "  position: absolute; right: 3px; bottom: 3px;",
    "  background: rgba(0, 0, 0, 0.8); color: #fff;",
    "  font-size: 10px; font-weight: 700; line-height: 1;",
    "  padding: 2px 4px; border-radius: 3px;",
    "}",
    // ── History drawer ──────────────────────────────────────────────────
    // Lives inside .panel, which is already position:fixed with
    // overflow:hidden, so the slide-in is clipped for free. It is a SIBLING
    // of .messages, never a child: renderMessages() wipes that subtree on
    // every animation frame while streaming and would destroy the drawer
    // sixty times a second.
    ".hist {",
    "  position: absolute; top: 0; bottom: 0; left: 0;",
    "  width: min(300px, 88%);",
    "  background: #fff; border-right: 1px solid #dcdcdc;",
    "  display: flex; flex-direction: column;",
    "  transform: translateX(-102%);",
    "  transition: transform 180ms ease;",
    "  z-index: 3;",
    "}",
    ".hist[hidden] { display: none; }",
    ".hist.open { transform: translateX(0); }",
    ".hist-scrim {",
    "  position: absolute; inset: 0;",
    "  background: rgba(0,0,0,0.35);",
    "  opacity: 0; pointer-events: none;",
    "  transition: opacity 180ms ease;",
    "  z-index: 2;",
    "}",
    ".hist-scrim.open { opacity: 1; pointer-events: auto; }",
    ".hist-head {",
    "  display: flex; align-items: center; gap: 8px;",
    "  padding: 10px 10px 8px 12px;",
    "  border-bottom: 1px solid #efefef;",
    "}",
    ".hist-new {",
    "  flex: 1; display: flex; align-items: center; gap: 6px;",
    "  background: #f5f5f5; border: 1px solid #dcdcdc; border-radius: 8px;",
    "  color: #000000; font-size: 12.5px; font-weight: 600;",
    "  padding: 7px 10px; cursor: pointer; text-align: left;",
    "}",
    ".hist-new:hover { background: #ebebeb; }",
    ".hist-close { background: transparent; border: none; color: #666666; cursor: pointer; padding: 4px; display: flex; }",
    ".hist-close:hover { color: #000000; }",
    ".hist-list { flex: 1; overflow-y: auto; padding: 6px 6px 10px; }",
    ".hist-item {",
    "  position: relative; display: block; width: 100%; text-align: left;",
    "  background: transparent; border: none; cursor: pointer;",
    "  padding: 8px 50px 8px 10px; margin: 1px 0;",
    "  border-radius: 8px; color: #333333;",
    "}",
    ".hist-item:hover { background: #f5f5f5; }",
    ".hist-item.is-active { background: #edf2f8; box-shadow: inset 2px 0 0 #56657d; }",
    ".hist-title {",
    "  display: block; font-size: 13px; line-height: 1.35; font-weight: 600;",
    "  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;",
    "}",
    ".hist-meta { display: block; font-size: 11px; color: #666666; margin-top: 2px; }",
    ".hist-rename {",
    "  width: 100%; font: inherit; font-size: 13px; font-weight: 600;",
    "  color: #333333; background: #fff;",
    "  border: 1px solid #999999; border-radius: 5px;",
    "  padding: 1px 5px; outline: none;",
    "}",
    ".hist-actions {",
    "  position: absolute; top: 50%; right: 4px; transform: translateY(-50%);",
    "  display: flex; align-items: center; gap: 1px;",
    "  opacity: 0; transition: opacity 120ms ease;",
    "}",
    ".hist-act { display: flex; color: #aaaaaa; cursor: pointer; padding: 4px; border-radius: 5px; }",
    ".hist-item:hover .hist-actions, .hist-actions:focus-within { opacity: 1; }",
    ".hist-act:hover { color: #000000; background: #e8e8e8; }",
    ".hist-del:hover { color: #d06b7a; background: #f9e9ec; }",
    ".hist-empty { padding: 22px 14px; font-size: 12.5px; color: #666666; text-align: center; line-height: 1.6; }",
    ".hist-foot {",
    "  border-top: 1px solid #efefef; padding: 9px 12px;",
    "  font-size: 11px; color: #666666;",
    "  display: flex; align-items: center; justify-content: space-between; gap: 8px;",
    "}",
    ".hist-clear { background: transparent; border: none; color: #666666; font-size: 11px; text-decoration: underline; cursor: pointer; padding: 0; }",
    ".hist-clear:hover { color: #000000; }",
    ".hist-clear.confirm { color: #d06b7a; font-weight: 700; text-decoration: none; }",
    // A file whose 24h upload window has closed. The chip stays so the
    // transcript still reads correctly; it just can't be sent again.
    ".chip.expired { opacity: 0.55; }",
    "@media (max-width: 600px) {",
    "  .btn { right: 8px; bottom: 6px; width: 74px; height: 74px; }",
    "  .panel {",
    "    position: fixed; inset: 0;",
    "    width: 100%; height: 100%;",
    "    border-radius: 0; border: none;",
    "    box-shadow: none;",
    "  }",
    "  .header { padding: 16px; padding-top: max(16px, env(safe-area-inset-top)); }",
    // The panel is already full-screen on mobile — the expand toggle is meaningless there.
    "  .header .expand { display: none; }",
    "  .messages { padding: 10px; }",
    "  .bubble { max-width: 95%; }",
    "  .input-row { padding: 8px 8px max(8px, env(safe-area-inset-bottom)); gap: 6px; }",
    // 16px minimum on every text field: iOS Safari auto-zooms the page when
    // focusing an input below 16px, leaving the widget larger than the screen.
    "  .input-row textarea { font-size: 16px; padding: 8px 10px; }",
    "  .feedback-comment textarea, .session-rating textarea, .modal textarea { font-size: 16px; }",
    "  .input-row .send { width: 34px; height: 34px; }",
    "  .footer { padding-bottom: max(8px, env(safe-area-inset-bottom)); }",
    // Below 600px this drawer IS the history UI for /ask-gary too: the
    // full-page chat is display:none there and the widget is force-opened
    // full screen (see the bridge in layouts/chatbot/single.html).
    "  .hist { width: min(340px, 92%); }",
    "  .hist-head { padding-top: max(10px, env(safe-area-inset-top)); }",
    "  .hist-item { padding-top: 10px; padding-bottom: 10px; }",
    "}"
  ].join("\n");

  var TEMPLATE = [
    '<button class="btn" type="button" aria-label="Open chat">',
    '  <span class="icon-chat">',
    '    <svg class="bubble-svg" viewBox="0 0 120 120" aria-hidden="true">',
    '      <defs>',
    '      <linearGradient id="gk-lb-body" x1="0.2" y1="0" x2="0.8" y2="1">',
    '      <stop offset="0" stop-color="#f8fafd"/><stop offset="0.5" stop-color="#edf2f8"/><stop offset="1" stop-color="#bfcbdc"/>',
    '      </linearGradient>',
    '      <linearGradient id="gk-lb-rim" x1="0" y1="0" x2="1" y2="1">',
    '      <stop offset="0" stop-color="#ffffff"/><stop offset="0.45" stop-color="#94a3b9"/><stop offset="1" stop-color="#56657d"/>',
    '      </linearGradient>',
    '      <linearGradient id="gk-lb-text" x1="0" y1="0" x2="0" y2="1">',
    '      <stop offset="0" stop-color="#5d6c86"/><stop offset="1" stop-color="#333f55"/>',
    '      </linearGradient>',
    '      <linearGradient id="gk-lb-gloss" x1="0" y1="0" x2="0" y2="1">',
    '      <stop offset="0" stop-color="#ffffff" stop-opacity="0.85"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/>',
    '      </linearGradient>',
    '      <clipPath id="gk-lb-clip"><path d="M21.4 71.7 A40 40 0 1 1 33.2 81.3 Q24 84 15 86 Q18 79 21.4 71.7 Z"/></clipPath>',
    '      <filter id="gk-lb-shadow" x="-25%" y="-25%" width="150%" height="160%">',
    '      <feDropShadow dx="0" dy="3" stdDeviation="3.2" flood-color="#5d6b82" flood-opacity="0.42"/>',
    '      </filter>',
    '      </defs>',
    '      <g transform="translate(8,8)">',
    '      <path d="M21.4 71.7 A40 40 0 1 1 33.2 81.3 Q24 84 15 86 Q18 79 21.4 71.7 Z" fill="url(#gk-lb-body)" filter="url(#gk-lb-shadow)"/>',
    '      <g clip-path="url(#gk-lb-clip)">',
    '      <ellipse cx="52" cy="14" rx="38" ry="20" fill="url(#gk-lb-gloss)"/>',
    '      </g>',
    '      <path d="M21.4 71.7 A40 40 0 1 1 33.2 81.3 Q24 84 15 86 Q18 79 21.4 71.7 Z" fill="none" stroke="url(#gk-lb-rim)" stroke-width="1.5" stroke-linejoin="round"/>',
    '      <text x="52" y="47.1" text-anchor="middle" dominant-baseline="central" font-size="19" font-weight="600" letter-spacing="0.4" fill="#ffffff" opacity="0.8">GaryAI</text>',
    '      <text x="52" y="46.5" text-anchor="middle" dominant-baseline="central" font-size="19" font-weight="600" letter-spacing="0.4" fill="url(#gk-lb-text)">GaryAI</text>',
    '      </g>',
    '    </svg>',
    '  </span>',
    '  <svg class="icon-close" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" style="display:none;">',
    '    <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
    '  </svg>',
    '</button>',
    '<div class="panel" role="dialog" aria-label="Chat" hidden>',
    '  <div class="header">',
    '    <div class="title">',
    '      <div class="name"></div>',
    '      <div class="status" style="display:none;"></div>',
    '    </div>',
    '    <button class="hist-btn" type="button" aria-label="Chat history" title="Chat history" aria-expanded="false" style="display:none;">',
    '      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">',
    '        <path d="M3 3v5h5"/>',
    '        <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/>',
    '        <path d="M12 7v5l3 2"/>',
    '      </svg>',
    '    </button>',
    '    <button class="expand" type="button" aria-label="Full screen">',
    '      <svg class="icon-expand" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">',
    '        <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>',
    '        <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>',
    '      </svg>',
    '      <svg class="icon-restore" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="display:none;">',
    '        <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>',
    '        <line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/>',
    '      </svg>',
    '    </button>',
    '    <button class="minimize" type="button" aria-label="Minimize">',
    '      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">',
    '        <line x1="5" y1="12" x2="19" y2="12"/>',
    '      </svg>',
    '    </button>',
    '    <button class="close" type="button" aria-label="Close">',
    '      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">',
    '        <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
    '      </svg>',
    '    </button>',
    '  </div>',
    '  <div class="messages"></div>',
    '  <div class="hist-scrim"></div>',
    '  <aside class="hist" aria-label="Chat history" hidden>',
    '    <div class="hist-head">',
    '      <button type="button" class="hist-new">',
    '        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    '        New chat',
    '      </button>',
    '      <button type="button" class="hist-close" aria-label="Close history">',
    '        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>',
    '      </button>',
    '    </div>',
    '    <div class="hist-list"></div>',
    '    <div class="hist-foot">',
    '      <span class="hist-note">Saved in this browser only.</span>',
    '      <button type="button" class="hist-clear">Clear</button>',
    '    </div>',
    '  </aside>',
    '  <div class="chips"></div>',
    '  <div class="upload-err" role="alert" aria-live="polite">',
    '    <span class="upload-err-text"></span>',
    '    <button class="upload-err-x" type="button" aria-label="Dismiss">&times;</button>',
    '  </div>',
    '  <div class="input-row">',
    '    <button class="attach" type="button" aria-label="Attach a file" title="Attach a file">',
    '      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
    '        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
    '      </svg>',
    '    </button>',
    '    <input class="file-input" type="file" multiple hidden accept=".pdf,.csv,.xlsx,.txt,.md,.png,.jpg,.jpeg,.webp,.gif">',
    '    <textarea rows="1" placeholder=""></textarea>',
    '    <button class="send" type="button" aria-label="Send" disabled>',
    '      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">',
    '        <line x1="22" y1="2" x2="11" y2="13"/>',
    '        <polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    '      </svg>',
    '    </button>',
    '  </div>',
    '  <div class="footer">',
    '    <span class="footer-text">Designed to improve automatically; <button type="button" class="footer-link general-feedback-btn">suggestions welcome</button>.</span>',
    '  </div>',
    '  <div class="modal-overlay" hidden>',
    '    <div class="modal" role="dialog" aria-label="Send feedback">',
    '      <h3>Share feedback</h3>',
    '      <p>Tell us what worked, what didn\'t, or anything you\'d like to see improved.</p>',
    '      <textarea class="modal-textarea" placeholder="Your feedback..."></textarea>',
    '      <div class="row">',
    '        <button type="button" class="modal-cancel">Cancel</button>',
    '        <button type="button" class="modal-send primary">Send</button>',
    '      </div>',
    '    </div>',
    '  </div>',
    '</div>'
  ].join("\n");

  var SEND_ICON_SVG =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
    '<line x1="22" y1="2" x2="11" y2="13"/>' +
    '<polygon points="22 2 15 22 11 13 2 9 22 2"/>' +
    '</svg>';

  var STOP_ICON_SVG =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">' +
    '<rect x="6" y="6" width="12" height="12" rx="2"/>' +
    '</svg>';

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function stripAttachTags(s) {
    return String(s).replace(/\[ATTACH:[^\]]*\]/g, "").replace(/\n{3,}/g, "\n\n").trim();
  }

  // Typeset LaTeX once per distinct formula. renderMessages() rebuilds every
  // bubble on each streamed token, so without this cache a long answer would
  // re-run KaTeX over every formula it contains on every frame.
  var mathCache = {};
  function renderTex(tex, display) {
    if (!(window.katex && window.katex.renderToString)) return null;
    var key = (display ? "D" : "I") + tex;
    if (mathCache[key] !== undefined) return mathCache[key];
    var out;
    try {
      out = window.katex.renderToString(tex, {
        displayMode: display,
        throwOnError: false,
        strict: false,
        trust: false,
        output: "html"
      });
    } catch (e) {
      out = null;
    }
    mathCache[key] = out;
    return out;
  }

  // An inline $…$ needs to survive prose that merely mentions money. Require
  // the delimiters to hug their content and the content to look like math
  // rather than a bare amount, which is what rules out "costs $5 and $10".
  function looksLikeInlineMath(s) {
    if (!s || /^\s|\s$/.test(s) || /\n\s*\n/.test(s) || s.length > 400) return false;
    return /[a-zA-Z\\^_{}=+\/<>]/.test(s);
  }

  /**
   * Pull code spans and math out of `text` before any markdown substitution
   * runs, leaving a \u0000n\u0000 placeholder behind for each. Math has to be
   * lifted out ahead of escapeHtml (which would turn `a < b` into `a &lt; b`
   * and feed that to KaTeX), and code has to be lifted so `$x$` inside a code
   * span stays literal.
   */
  function protectSpans(src) {
    src = String(src);
    var spans = [];
    var out = "";
    var i = 0;

    function hold(html) {
      spans.push(html);
      return "\u0000" + (spans.length - 1) + "\u0000";
    }

    // A display block is its own box, so drop one newline on each side to keep
    // the pre-wrap bubble from stacking a blank line above and below it.
    function holdDisplay(html) {
      out = out.replace(/[ \t]*\n[ \t]*$/, "");
      return hold(html);
    }
    function eatTrailingNewline() {
      var m = /^[ \t]*\n[ \t]*/.exec(src.slice(i));
      if (m) i += m[0].length;
    }

    function closeAt(open, close, from) {
      var at = src.indexOf(close, from);
      return at === -1 ? -1 : at;
    }

    while (i < src.length) {
      var rest = src.slice(i);
      var at;

      // Fenced code: not rendered as a block today, but its content must not
      // be typeset, so hold it verbatim (backticks and all).
      if (rest.slice(0, 3) === "```") {
        at = closeAt("```", "```", i + 3);
        if (at === -1) { out += hold(escapeHtml(rest)); break; }
        out += hold(escapeHtml(src.slice(i, at + 3)));
        i = at + 3;
        continue;
      }

      if (rest.charAt(0) === "`") {
        at = closeAt("`", "`", i + 1);
        if (at !== -1 && at > i + 1) {
          out += hold("<code>" + escapeHtml(src.slice(i + 1, at)) + "</code>");
          i = at + 1;
          continue;
        }
      }

      if (rest.slice(0, 2) === "$$") {
        at = closeAt("$$", "$$", i + 2);
        if (at !== -1) {
          var dtex = src.slice(i + 2, at);
          i = at + 2;
          out += holdDisplay(renderTex(dtex, true) || escapeHtml("$$" + dtex + "$$"));
          eatTrailingNewline();
          continue;
        }
        // Unterminated: mid-stream. Leave it raw; the closer arrives shortly.
      }

      if (rest.slice(0, 2) === "\\[") {
        at = closeAt("\\]", "\\]", i + 2);
        if (at !== -1) {
          var btex = src.slice(i + 2, at);
          i = at + 2;
          out += holdDisplay(renderTex(btex, true) || escapeHtml("\\[" + btex + "\\]"));
          eatTrailingNewline();
          continue;
        }
      }

      if (rest.slice(0, 2) === "\\(") {
        at = closeAt("\\)", "\\)", i + 2);
        if (at !== -1) {
          var ptex = src.slice(i + 2, at);
          out += hold(renderTex(ptex, false) || escapeHtml("\\(" + ptex + "\\)"));
          i = at + 2;
          continue;
        }
      }

      // Escaped dollar — a literal, never a delimiter.
      if (rest.slice(0, 2) === "\\$") {
        out += "$";
        i += 2;
        continue;
      }

      if (rest.charAt(0) === "$") {
        at = src.indexOf("$", i + 1);
        if (at !== -1) {
          var itex = src.slice(i + 1, at);
          if (looksLikeInlineMath(itex)) {
            out += hold(renderTex(itex, false) || escapeHtml("$" + itex + "$"));
            i = at + 1;
            continue;
          }
        }
      }

      out += src.charAt(i);
      i += 1;
    }

    return { text: out, spans: spans };
  }

  function renderInline(text) {
    var held = protectSpans(text);
    var html = escapeHtml(held.text);
    // Convert markdown headings (# … ######) to bold text
    html = html.replace(/^(#{1,6})\s+(.+)$/gm, function (_, hashes, content) {
      return "<strong>" + content + "</strong>";
    });
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, t, u) {
      var safeUrl = /^(https?:|mailto:|\/)/i.test(u) ? u : "#";
      return '<a href="' + escapeHtml(safeUrl) + '" target="_blank" rel="noopener noreferrer">' + t + "</a>";
    });
    return html.replace(/\u0000(\d+)\u0000/g, function (m, n) {
      var s = held.spans[Number(n)];
      return s === undefined ? m : s;
    });
  }

  function hostOf(u) {
    try { return new URL(u).hostname; }
    catch (e) { return u; }
  }

  function renderPreviewsHtml(previews) {
    if (!previews || previews.length === 0) return "";
    var items = previews
      .map(function (p) {
        if (!p || !p.url) return "";
        var host = hostOf(p.url).replace(/^www\./, "");
        var siteName = p.site_name || host;
        var imgHtml;
        if (p.image) {
          imgHtml =
            '<img class="preview-card-image" src="' +
            escapeHtml(p.image) +
            '" alt="" loading="lazy" onerror="this.style.display=\'none\'">';
        } else {
          var favicon =
            "https://www.google.com/s2/favicons?domain=" +
            encodeURIComponent(host) +
            "&sz=128";
          imgHtml =
            '<div class="preview-card-favicon-wrap">' +
            '<img class="preview-card-favicon" src="' +
            escapeHtml(favicon) +
            '" alt="" loading="lazy" onerror="this.parentElement.style.display=\'none\'">' +
            "</div>";
        }
        // YouTube lecture cards carry a timestamp — wrap the thumbnail with a
        // play overlay and a "m:ss" badge so it reads as "jump to this moment".
        if (p.timestamp) {
          imgHtml =
            '<div class="preview-card-thumb">' + imgHtml +
            '<div class="preview-card-play"></div>' +
            '<div class="preview-card-ts">' + escapeHtml(p.timestamp) + "</div>" +
            "</div>";
        }
        var descHtml = p.description
          ? '<div class="preview-card-desc">' + escapeHtml(p.description) + "</div>"
          : "";
        return (
          '<a class="preview-card" href="' +
          escapeHtml(p.url) +
          '" target="_blank" rel="noopener noreferrer">' +
          imgHtml +
          '<div class="preview-card-body">' +
          '<div class="preview-card-site">' + escapeHtml(siteName) + "</div>" +
          '<div class="preview-card-title">' + escapeHtml(p.title || p.url) + "</div>" +
          descHtml +
          "</div>" +
          "</a>"
        );
      })
      .join("");
    return '<div class="previews">' + items + "</div>";
  }

  function renderFiguresHtml(figures) {
    if (!figures || figures.length === 0) return "";
    var items = figures
      .map(function (f) {
        if (!f || !f.url) return "";
        var url = escapeHtml(f.url);
        var alt = escapeHtml(f.caption || "");
        var captionParts = [];
        if (f.caption) captionParts.push(escapeHtml(f.caption));
        if (f.source_title) captionParts.push("— " + escapeHtml(f.source_title));
        var caption = captionParts.join(" ");
        return (
          '<div class="figure">' +
          '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' +
          '<img src="' + url + '" alt="' + alt + '" loading="lazy" />' +
          "</a>" +
          (caption ? '<div class="figure-caption">' + caption + "</div>" : "") +
          "</div>"
        );
      })
      .join("");
    return (
      '<div class="figures">' +
      '<div class="figures-label">Referenced figure' +
      (figures.length > 1 ? "s" : "") +
      "</div>" +
      items +
      "</div>"
    );
  }

  function init() {
    if (window.GKingChat && window.GKingChat.__mounted) return; // prevent double-mount

    var config = readConfig();
    if (!config.apiUrl) {
      console.error(
        "[GKing Chat Widget] apiUrl is required. Set window.GKingChatConfig.apiUrl or data-api-url on the script tag."
      );
      return;
    }

    var host = document.createElement("div");
    host.id = "gking-chat-widget";
    host.style.cssText = "all: initial;";
    document.body.appendChild(host);

    var shadow = host.attachShadow({ mode: "open" });
    var styleEl = document.createElement("style");
    styleEl.textContent = CSS;
    shadow.appendChild(styleEl);
    shadowRootEl = shadow;
    injectKatexCss(shadow);

    var wrapper = document.createElement("div");
    wrapper.innerHTML = TEMPLATE;
    while (wrapper.firstChild) shadow.appendChild(wrapper.firstChild);

    var btn = shadow.querySelector(".btn");
    var iconChat = shadow.querySelector(".icon-chat");
    var iconClose = shadow.querySelector(".icon-close");
    var panel = shadow.querySelector(".panel");
    var headerName = shadow.querySelector(".header .name");
    var closeBtn = shadow.querySelector(".close");
    var expandBtn = shadow.querySelector(".expand");
    var iconExpand = shadow.querySelector(".icon-expand");
    var iconRestore = shadow.querySelector(".icon-restore");
    var minimizeBtn = shadow.querySelector(".minimize");
    var messagesEl = shadow.querySelector(".messages");
    var textarea = shadow.querySelector(".input-row textarea");
    var sendBtn = shadow.querySelector(".send");
    var attachBtn = shadow.querySelector(".attach");
    var fileInput = shadow.querySelector(".file-input");
    var chipsEl = shadow.querySelector(".chips");
    var errEl = shadow.querySelector(".upload-err");
    var errTextEl = shadow.querySelector(".upload-err-text");
    var generalFeedbackBtn = shadow.querySelector(".general-feedback-btn");
    var modalOverlay = shadow.querySelector(".modal-overlay");
    var modalTextarea = shadow.querySelector(".modal-textarea");
    var modalSendBtn = shadow.querySelector(".modal-send");
    var modalCancelBtn = shadow.querySelector(".modal-cancel");
    var histBtn = shadow.querySelector(".hist-btn");
    var histEl = shadow.querySelector(".hist");
    var histScrim = shadow.querySelector(".hist-scrim");
    var histListEl = shadow.querySelector(".hist-list");
    var histNewBtn = shadow.querySelector(".hist-new");
    var histCloseBtn = shadow.querySelector(".hist-close");
    var histClearBtn = shadow.querySelector(".hist-clear");

    headerName.textContent = config.botName;
    textarea.placeholder = config.inputPlaceholder;

    var messages = [];
    var loading = false;
    var streaming = false;
    var abortController = null;
    var open = false;
    var openedAt = null;
    var conversationId = null;
    /* Perceived latency: time-to-first-token is what the user actually waits
       for, and it was previously unmeasured — only total round-trip. */
    var turnStartedAt = null;
    var firstTokenAt = null;
    // Smooth streaming: tokens accumulate in streamTarget; an rAF loop copies
    // a growing prefix into messages[idx].content (3-8 chars/frame ≈ 200 cps),
    // so the UI animates smoothly instead of jumping per SSE delta.
    var streamTarget = "";
    var streamRevealed = 0;
    var streamRevealActive = false;
    var streamMsgIdx = -1;
    // Per-message feedback state, keyed by message.id:
    //   { rated: 'up'|'down'|null, commentOpen: bool, commentDraft: string, commentSent: bool }
    var feedbackState = {};
    // Waiting caption: how long the dots stay bare before we put words to the
    // wait. Long enough that a quick answer never flashes it.
    var WAITING_CAPTION_MS = 600;
    var waitingSince = 0;
    var waitingTimer = null;
    // Which finished step threads the reader has re-opened, by message id.
    // Kept out here rather than on the DOM because renderMessages() rebuilds
    // the whole transcript on every frame.
    var expandedThreads = {};
    // Session-rating card (Claude-Code-style micro-survey): pops inline after
    // the 2nd completed assistant reply, once per conversation.
    var sessionRating = { shown: false, dismissed: false, rated: null, commentOpen: false, commentDraft: "", commentSent: false };

    /* Which conversation THIS TAB is looking at. Per-tab by construction, so
       two open tabs never fight over it — the durable archive in
       gk-history.js is what they share. Kept in sessionStorage for the same
       reason as before: a reload continues the conversation the visitor asked
       for rather than silently forking a new one, and it dies with the tab.
       gk-history.js reads and writes this exact key, so the two paths below
       are interchangeable and nothing is orphaned if the module loads late. */
    var CONV_KEY = "gk_conv_widget";
    var histOpen = false;
    var attachmentsExpired = false;

    function ensureConversationId() {
      if (!conversationId) {
        if (HIST) conversationId = HIST.activeId();
        if (!conversationId) {
          try { conversationId = sessionStorage.getItem(CONV_KEY) || null; } catch (e) {}
        }
        if (!conversationId) conversationId = uuid();
        setActiveConversation(conversationId);
      }
      currentConversationId = conversationId;
      if (trackerReady) T.setConversationId(conversationId);
      return conversationId;
    }

    /** The one place the active id is written, so restore and a fresh turn
     *  can't drift apart. */
    function setActiveConversation(id) {
      conversationId = id || null;
      currentConversationId = conversationId;
      if (HIST) HIST.setActive(id || null);
      else {
        try {
          if (id) sessionStorage.setItem(CONV_KEY, id);
          else sessionStorage.removeItem(CONV_KEY);
        } catch (e) {}
      }
      if (id && trackerReady) T.setConversationId(id);
    }

    /* Record the conversation. Debounced inside gk-history.js, and a no-op
       until the module has loaded (or forever, if it never does). */
    function persist() {
      if (!HIST || !conversationId) return;
      HIST.save({
        id: conversationId,
        surface: "embed",
        messages: messages,
        feedbackState: feedbackState,
        ratingDone: !!(sessionRating.rated || sessionRating.dismissed)
      });
    }

    // Click-through beacon: one delegated listener catches every link in the
    // messages area (inline citations, preview cards, figures). Links open in
    // _blank so the page survives to deliver the request.
    //
    // The widget lives in a shadow root, so gk-track's own bindAnswerLinks
    // selector work does not reach in here — this stays local, and adds the
    // link's rank within its answer so click-through can be modelled by
    // position rather than merely counted.
    function fireClickBeacon(a) {
      try {
        var href = a.href || "";
        if (!/^https?:/i.test(href)) return;
        var kind = "inline";
        if (a.classList.contains("preview-card")) kind = "preview";
        else if (a.closest && a.closest(".figure")) kind = "figure";

        var rank = null;
        try {
          var msg = (a.closest && a.closest(".msg")) || messagesEl;
          var links = msg.querySelectorAll("a[href^='http']");
          for (var i = 0; i < links.length; i++) { if (links[i] === a) { rank = i + 1; break; } }
        } catch (e) {}

        if (trackerReady) {
          T.track("citation_click", { url: href.slice(0, 1000), kind: kind, rank: rank }, { immediate: true });
          return;
        }
        // Fallback when gk-track.js was blocked by a host CSP.
        new Image().src =
          PIXEL_URL + "?e=click&t=widget" +
          "&url=" + encodeURIComponent(href) +
          "&k=" + kind +
          (rank ? "&rank=" + rank : "") +
          "&c=" + encodeURIComponent(conversationId || "") +
          "&u=" + encodeURIComponent(location.host + location.pathname) +
          "&_=" + Date.now();
      } catch (e) {}
    }
    function onMessagesClick(ev) {
      if (ev.type === "auxclick" && ev.button !== 1) return;
      var summaryBtn =
        ev.target && ev.target.closest ? ev.target.closest(".thread-summary") : null;
      if (summaryBtn) {
        var tid = summaryBtn.getAttribute("data-thread-id");
        if (tid) {
          expandedThreads[tid] = true;
          var msg = null;
          for (var i = 0; i < messages.length; i++) {
            if (messages[i].id === tid) { msg = messages[i]; break; }
          }
          track("step_thread_expanded", { step_count: msg && msg.steps ? msg.steps.count() : 0 });
          renderMessages();
        }
        return;
      }
      var a = ev.target && ev.target.closest ? ev.target.closest("a") : null;
      if (a) fireClickBeacon(a);
    }
    messagesEl.addEventListener("click", onMessagesClick);
    messagesEl.addEventListener("auxclick", onMessagesClick);

    // Gary's picture beside his bubbles; the time above a user bubble. Turns
    // restored from history saved before 1.10.0 carry no `at`, so no time.
    function avatarSmHtml() {
      return '<img class="avatar-sm" src="' + escapeHtml(config.avatarUrl) + '" alt="' + escapeHtml(config.avatarLabel) + '">';
    }
    function fmtMsgTime(ms) {
      try {
        return new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      } catch (e) {
        return "";
      }
    }

    function snapshotMessages() {
      return messages.map(function (m) {
        return { role: m.role, content: m.content };
      });
    }

    function postFeedback(payload) {
      var url = deriveFeedbackUrl(config);
      if (!url) {
        console.warn("[GKing Chat Widget] feedbackUrl not configured; payload not sent:", payload);
        return;
      }
      if (url === "console:") {
        console.log("[GKing Chat Widget] feedback (console mode):", payload);
        return;
      }
      try {
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(function (e) {
          console.error("[GKing Chat Widget] feedback POST failed:", e);
        });
      } catch (e) {
        console.error("[GKing Chat Widget] feedback POST threw:", e);
      }
    }

    function buildFeedbackPayload(opts) {
      // opts: { messageId, ratedIndex, feedbackType, rating, comment }
      return {
        conversation_id: ensureConversationId(),
        message_id: opts.messageId,
        bot_id: config.botId,
        timestamp: new Date().toISOString(),
        feedback_type: opts.feedbackType,
        rating: opts.rating || null,
        comment: opts.comment || null,
        messages_snapshot: snapshotMessages(),
        rated_message_index: opts.ratedIndex == null ? null : opts.ratedIndex,
        page_url: location.href,
        user_agent: navigator.userAgent,
        widget_version: WIDGET_VERSION,
        source: "embed"
      };
    }

    function syncCommentDrafts() {
      // Preserve in-progress comment text across re-renders.
      var nodes = messagesEl.querySelectorAll("[data-comment-textarea]");
      for (var i = 0; i < nodes.length; i++) {
        var id = nodes[i].getAttribute("data-comment-textarea");
        if (feedbackState[id]) feedbackState[id].commentDraft = nodes[i].value;
      }
      var srTa = messagesEl.querySelector("[data-sr-textarea]");
      if (srTa) sessionRating.commentDraft = srTa.value;
    }

    function maybeShowSessionRating() {
      if (sessionRating.shown) return;
      var n = 0;
      for (var i = 0; i < messages.length; i++) {
        if (messages[i].role === "assistant" && stripAttachTags(messages[i].content)) n++;
      }
      if (n < 2) return;
      for (var id in feedbackState) {
        if (feedbackState[id] && feedbackState[id].rated) return;
      }
      sessionRating.shown = true;
      postFeedback(buildFeedbackPayload({ messageId: "session", ratedIndex: null, feedbackType: "session_rating_shown", rating: null }));
      track("rating_shown", { kind: "session" });
    }

    function hideSessionRatingSoon() {
      setTimeout(function () {
        if (!sessionRating.commentOpen) {
          sessionRating.dismissed = true;
          renderMessages();
        }
      }, 4000);
    }

    function renderSessionRatingCard() {
      var card = document.createElement("div");
      card.className = "session-rating";
      if (sessionRating.rated) {
        if (sessionRating.commentOpen) {
          card.innerHTML =
            '<div class="sr-question">Thanks &mdash; anything we could do better? <span class="sr-optional">(optional)</span></div>' +
            '<textarea data-sr-textarea placeholder="Your suggestion..."></textarea>' +
            '<div class="sr-actions">' +
            '<button type="button" data-action="sr-comment-cancel" data-msg-id="session">No thanks</button>' +
            '<button type="button" class="primary" data-action="sr-comment-send" data-msg-id="session">Send</button></div>';
          card.querySelector("textarea").value = sessionRating.commentDraft || "";
        } else {
          card.innerHTML = '<div class="sr-thanks">Thanks for your feedback!</div>';
        }
      } else {
        card.innerHTML =
          '<button type="button" class="sr-dismiss" data-action="sr-dismiss" data-msg-id="session" aria-label="Dismiss">&#10005;</button>' +
          '<div class="sr-question">How is GaryAI doing so far?</div>' +
          '<div class="sr-options">' +
          '<button type="button" data-action="sr-rate" data-sr-value="good" data-msg-id="session">&#128522; Great</button>' +
          '<button type="button" data-action="sr-rate" data-sr-value="fine" data-msg-id="session">&#128528; OK</button>' +
          '<button type="button" data-action="sr-rate" data-sr-value="bad" data-msg-id="session">&#128542; Not helpful</button>' +
          '</div>';
      }
      return card;
    }

    function renderFeedbackRow(m, msgIdx) {
      var st = feedbackState[m.id] || {};
      var rated = st.rated || null;
      var row = document.createElement("div");
      row.className = "feedback-row";
      row.innerHTML =
        '<button class="feedback-btn up' +
        (rated === "up" ? " active" : "") +
        '" type="button" aria-label="Helpful"' +
        (rated ? " disabled" : "") +
        ' data-action="rate-up" data-msg-id="' +
        escapeHtml(m.id) +
        '" data-msg-idx="' +
        msgIdx +
        '">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="' +
        (rated === "up" ? "currentColor" : "none") +
        '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 11v9a1 1 0 0 0 1 1h9.5a2 2 0 0 0 2-1.7l1.4-7A2 2 0 0 0 19 10h-5l1-4a2 2 0 0 0-2-2.5L8 11z"/><path d="M3 11h4v10H3z"/></svg>' +
        "</button>" +
        '<button class="feedback-btn down' +
        (rated === "down" ? " active" : "") +
        '" type="button" aria-label="Not helpful"' +
        (rated ? " disabled" : "") +
        ' data-action="rate-down" data-msg-id="' +
        escapeHtml(m.id) +
        '" data-msg-idx="' +
        msgIdx +
        '">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="' +
        (rated === "down" ? "currentColor" : "none") +
        '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 13V4a1 1 0 0 0-1-1H6.5a2 2 0 0 0-2 1.7l-1.4 7A2 2 0 0 0 5 14h5l-1 4a2 2 0 0 0 2 2.5L16 13z"/><path d="M21 13h-4V3h4z"/></svg>' +
        "</button>" +
        (st.commentSent ? '<span class="feedback-thanks">Thanks for your feedback.</span>' : "");
      return row;
    }

    function renderCommentBox(m, msgIdx) {
      var st = feedbackState[m.id] || {};
      var draft = st.commentDraft || "";
      var box = document.createElement("div");
      box.className = "feedback-comment";
      box.innerHTML =
        '<textarea data-comment-textarea="' +
        escapeHtml(m.id) +
        '" placeholder="What was wrong with this answer? (optional)"></textarea>' +
        '<div class="row">' +
        '<button type="button" data-action="comment-cancel" data-msg-id="' +
        escapeHtml(m.id) +
        '">No thanks</button>' +
        '<button type="button" class="primary" data-action="comment-send" data-msg-id="' +
        escapeHtml(m.id) +
        '" data-msg-idx="' +
        msgIdx +
        '">Send</button>' +
        "</div>";
      // textContent assignment preserves any characters the user typed
      var ta = box.querySelector("textarea");
      ta.value = draft;
      return box;
    }

    /**
     * The step thread, as a plain string rebuilt from state.
     *
     * renderMessages() destroys and rebuilds this subtree on every animation
     * frame while streaming, so the thread must hold nothing in the DOM that
     * it can't recompute — no timers, no expand state stored on the element.
     * The live step keeps a stable `is-live` class across rebuilds, which is
     * what stops its CSS animation restarting (and visibly stuttering) 60
     * times a second.
     */
    function renderStepsHtml(thread, msgId) {
      if (!thread || thread.isEmpty()) return "";
      var summary = thread.summary();
      // Finished turns fold to one quiet line, so a read-back conversation is
      // prose rather than a log — unless the reader asked to see the steps.
      if (summary && !expandedThreads[msgId]) {
        return (
          '<button type="button" class="thread-summary" data-thread-id="' +
          escapeHtml(msgId) + '">' + escapeHtml(summary) + "</button>"
        );
      }
      if (!summary && !thread.isVisible()) return "";
      var steps = thread.steps();
      var live = thread.liveStep();
      var out = '<ol class="thread">';
      for (var i = 0; i < steps.length; i++) {
        var cls = live && steps[i].id === live.id ? "thread-step is-live" : "thread-step is-done";
        out +=
          '<li class="' + cls + '"><span class="thread-dot"></span>' +
          escapeHtml(steps[i].label) + "</li>";
      }
      out += "</ol>";
      return out;
    }

    function renderMessages() {
      syncCommentDrafts();
      messagesEl.innerHTML = "";
      if (messages.length === 0) {
        var welcome = document.createElement("div");
        welcome.className = "msg bot";
        welcome.innerHTML =
          avatarSmHtml() +
          '<div class="bubble">' +
          renderInline(config.welcomeMessage) +
          "</div>";
        messagesEl.appendChild(welcome);
      } else {
        messages.forEach(function (m, mi) {
          var node = document.createElement("div");
          node.className = "msg " + (m.role === "user" ? "user" : "bot");
          if (m.role === "user") {
            // Echo attachment chips inside the sent bubble so the turn stays
            // legible once the composer clears.
            var uchips = m.attachmentChips && m.attachmentChips.length
              ? '<div class="chips">' + chipsHtml(m.attachmentChips, true, !!m.attachmentsExpired) + "</div>" : "";
            node.innerHTML =
              '<div class="ucol">' +
              (m.at ? '<div class="msg-time">' + escapeHtml(fmtMsgTime(m.at)) + "</div>" : "") +
              '<div class="bubble">' + uchips + escapeHtml(m.content) + "</div>" +
              "</div>" + USER_ICON_SVG;
          } else {
            var visible = stripAttachTags(m.content);
            var isLastForFigs = mi === messages.length - 1;
            var showExtras = !(streaming && isLastForFigs);
            var showFigures = m.figures && m.figures.length > 0 && showExtras;
            var showPreviews = m.previews && m.previews.length > 0 && showExtras;
            // The thread sits above the prose: it describes the work that
            // produced the answer, so it reads as preamble, not footnote.
            var stepsHtml = renderStepsHtml(m.steps, m.id);
            node.innerHTML =
              avatarSmHtml() +
              '<div class="bubble">' +
              stepsHtml +
              renderInline(visible) +
              (showPreviews ? renderPreviewsHtml(m.previews) : "") +
              (showFigures ? renderFiguresHtml(m.figures) : "") +
              "</div>";
          }
          messagesEl.appendChild(node);
          var isLast = mi === messages.length - 1;
          var canRate =
            m.role === "assistant" &&
            !!stripAttachTags(m.content) &&
            !(streaming && isLast);
          if (canRate) {
            messagesEl.appendChild(renderFeedbackRow(m, mi));
            var st = feedbackState[m.id];
            if (st && st.commentOpen) {
              messagesEl.appendChild(renderCommentBox(m, mi));
            }
          }
        });
      }
      if (
        loading &&
        (messages.length === 0 || messages[messages.length - 1].role !== "assistant")
      ) {
        var typing = document.createElement("div");
        typing.className = "msg bot";
        // Measured on the live pipeline: 4s to first token on the fast path,
        // 8s before the first step on the tool-using path. Bare dots for that
        // long read as a hang, so after a beat a caption joins them underneath
        // — the dots keep running, since they are the thing that reads as
        // "still alive". The wording avoids "reading", which the step labels
        // use for specific papers: "Reading that over" then "Reading <title>"
        // invites the reader to think the first line named a paper too.
        var waited = waitingSince ? Date.now() - waitingSince : 0;
        typing.innerHTML =
          avatarSmHtml() +
          '<div class="wait-stack">' +
          '<div class="typing"><span></span><span></span><span></span></div>' +
          (waited >= WAITING_CAPTION_MS
            ? '<div class="waiting" role="status">Thinking it through</div>'
            : "") +
          "</div>";
        messagesEl.appendChild(typing);
      }
      if (sessionRating.shown && !sessionRating.dismissed) {
        messagesEl.appendChild(renderSessionRatingCard());
      }
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    // The panel is full-screen at <=600px (same breakpoint as the CSS media query).
    function isMobileViewport() {
      return window.matchMedia && window.matchMedia("(max-width: 600px)").matches;
    }

    // Lock host-page scrolling while the full-screen panel is open so the page
    // can't scroll or rubber-band behind it. Saves the host's inline styles so
    // unlocking restores whatever was there before.
    var savedOverflow = null;
    function lockPageScroll(lock) {
      var docEl = document.documentElement;
      if (lock && savedOverflow === null) {
        savedOverflow = [docEl.style.overflow, document.body.style.overflow];
        docEl.style.overflow = "hidden";
        document.body.style.overflow = "hidden";
      } else if (!lock && savedOverflow !== null) {
        docEl.style.overflow = savedOverflow[0];
        document.body.style.overflow = savedOverflow[1];
        savedOverflow = null;
      }
    }

    var fullscreen = false;
    function setFullscreen(next) {
      fullscreen = next;
      panel.classList.toggle("fullscreen", fullscreen);
      iconExpand.style.display = fullscreen ? "none" : "";
      iconRestore.style.display = fullscreen ? "" : "none";
      expandBtn.setAttribute("aria-label", fullscreen ? "Exit full screen" : "Full screen");
      lockPageScroll(open && (isMobileViewport() || fullscreen));
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function setOpen(next) {
      open = next;
      panel.hidden = !open;
      // Closing always restores the default popup size, so reopening never
      // surprises the user with a full-screen takeover.
      if (!open && fullscreen) setFullscreen(false);
      btn.setAttribute("aria-label", open ? "Close chat" : "Open chat");
      iconChat.style.display = open ? "none" : "";
      iconClose.style.display = open ? "" : "none";
      var mobile = isMobileViewport();
      lockPageScroll(open && (mobile || fullscreen));
      if (open) {
        firePixel("widget");
        // Answers routinely contain LaTeX; fetch the typesetter on first open
        // and repaint once it lands so anything already on screen typesets.
        katexOnReady = function () { renderMessages(); };
        loadKatex();
        // Deferred to here rather than to mount: this widget is on every page
        // and nothing needs the archive until the chat is actually opened.
        historyOnReady = historyReadyNow;
        if (HIST) historyReadyNow(); else loadHistory();
        openedAt = Date.now();
        // widget_open is now distinct from widget_impression (fired on load).
        // Conflating the two is what made the widget's "45% conversion" and
        // the full page's "19%" look comparable when they never were.
        track("widget_open", { since_load_ms: Date.now() - loadedAt });
        renderMessages();
        // Don't autofocus on mobile: it pops the keyboard over the welcome
        // message the moment the panel opens.
        if (!mobile) {
          setTimeout(function () {
            textarea.focus();
          }, 0);
        }
      } else if (openedAt) {
        // Never leave a stale drawer to greet the next open.
        if (histOpen) setHistoryOpen(false);
        track("widget_close", {
          open_ms: Date.now() - openedAt,
          messages_sent: messages.filter(function (m) { return m.role === "user"; }).length
        });
        openedAt = null;
      }
    }

    // ── Conversation history ────────────────────────────────────────────

    function historyReadyNow() {
      if (!HIST) return;
      histBtn.style.display = "";
      HIST.subscribe(function () { if (histOpen) renderHistory(); });
      /* A save can fork around another tab that moved the same conversation
         on; follow the fork, or this tab's next turn keeps writing under an
         id that is no longer its own. */
      HIST.onFork(function (oldId, newId) {
        if (conversationId === oldId) setActiveConversation(newId);
      });
      /* Reopening after a reload should show the conversation the tab was in,
         not an empty panel under the same id — which is what happened before
         history existed. */
      var active = HIST.activeId();
      if (active && messages.length === 0) {
        HIST.get(active).then(function (conv) {
          if (conv && conv.messages.length && messages.length === 0) applyConversation(conv);
        });
      }
      if (histOpen) renderHistory();
    }

    function applyConversation(conv) {
      messages = conv.messages;
      feedbackState = conv.feedbackState || {};
      expandedThreads = {};
      attachmentsExpired = !!conv.attachmentsExpired;
      /* The micro-survey pops after the 2nd assistant reply. On a restored
         six-turn thread that would fire the instant it opens, so suppress it
         for a conversation that already answered (or dismissed) it. */
      sessionRating = { shown: !!conv.ratingDone, dismissed: !!conv.ratingDone, rated: null, commentOpen: false, commentDraft: "", commentSent: false };
      setActiveConversation(conv.id);
      renderMessages();
      /* Reuses the upload notice bar rather than adding a second one. Without
         this the model would appear to have forgotten a document the
         transcript plainly shows — the file_ids expired after 24h and were
         stripped on the way in so they can never be resent. */
      if (attachmentsExpired) {
        showUploadNote("Files from this chat are no longer available. Attach them again if you'd like another look.");
      } else {
        clearUploadError();
      }
    }

    function restoreConversation(id) {
      if (!HIST || !id) return;
      HIST.flush();
      HIST.get(id).then(function (conv) {
        if (!conv) return;
        applyConversation(conv);
        setHistoryOpen(false);
        if (!isMobileViewport()) setTimeout(function () { textarea.focus(); }, 0);
      });
    }

    /** Abandon the current conversation — it stays in the archive, it is not
     *  erased — and start a fresh one. */
    function newConversation() {
      if (HIST) HIST.flush();
      messages = [];
      feedbackState = {};
      expandedThreads = {};
      attachmentsExpired = false;
      sessionRating = { shown: false, dismissed: false, rated: null, commentOpen: false, commentDraft: "", commentSent: false };
      // Nothing is written until the first turn, so the list never fills up
      // with empty threads.
      setActiveConversation(null);
      renderMessages();
    }

    function renderHistory() {
      if (!HIST) return;
      // A rebuild mid-rename would discard what the visitor is typing.
      if (histListEl.querySelector("input")) return;
      HIST.list().then(function (items) {
        if (!items.length) {
          histListEl.innerHTML = '<div class="hist-empty">Your past chats will appear here.</div>';
          return;
        }
        var html = "";
        for (var i = 0; i < items.length; i++) {
          var it = items[i];
          html +=
            '<button type="button" class="hist-item' + (it.id === conversationId ? " is-active" : "") +
            '" data-hist-id="' + escapeHtml(it.id) + '">' +
            '<span class="hist-title">' + escapeHtml(it.title || "New chat") + "</span>" +
            '<span class="hist-meta">' + it.turns + (it.turns === 1 ? " message · " : " messages · ") +
            escapeHtml(it.when) + "</span>" +
            '<span class="hist-actions">' +
            '<span class="hist-act" role="button" tabindex="0" aria-label="Rename this chat" title="Rename" data-hist-ren="' + escapeHtml(it.id) + '">' +
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>' +
            "</span>" +
            '<span class="hist-act hist-del" role="button" tabindex="0" aria-label="Delete this chat" title="Delete" data-hist-del="' + escapeHtml(it.id) + '">' +
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>' +
            "</span></span></button>";
        }
        histListEl.innerHTML = html;
      });
    }

    function setHistoryOpen(next) {
      histOpen = !!next && !!HIST;
      histEl.hidden = !histOpen;
      histBtn.setAttribute("aria-expanded", histOpen ? "true" : "false");
      resetClearConfirm();
      if (histOpen) {
        renderHistory();
        // Let the hidden->shown paint land before transitioning, or the
        // drawer appears already open instead of sliding in.
        requestAnimationFrame(function () {
          histEl.classList.add("open");
          histScrim.classList.add("open");
        });
      } else {
        histEl.classList.remove("open");
        histScrim.classList.remove("open");
      }
    }

    var clearArmed = false;
    function resetClearConfirm() {
      clearArmed = false;
      histClearBtn.textContent = "Clear";
      histClearBtn.classList.remove("confirm");
    }

    function isBusy() { return loading || streaming; }

    function updateSendState() {
      if (isBusy()) {
        sendBtn.disabled = false;
        sendBtn.innerHTML = STOP_ICON_SVG;
        sendBtn.setAttribute("aria-label", "Stop");
        sendBtn.classList.add("stop");
      } else {
        // A ready attachment alone is enough to send; an in-flight upload blocks
        // sending so a file can't be half-attached to a turn.
        var hasReady = typeof readyAttachments === "function" && readyAttachments().length > 0;
        var busyUploading = typeof anyUploading === "function" && anyUploading();
        sendBtn.disabled = (!textarea.value.trim() && !hasReady) || busyUploading;
        sendBtn.innerHTML = SEND_ICON_SVG;
        sendBtn.setAttribute("aria-label", "Send");
        sendBtn.classList.remove("stop");
      }
    }

    function handleSendClick() {
      if (isBusy()) {
        // Stopping mid-generation is the clearest "too slow / wrong direction"
        // signal there is — much stronger than a rating the user never leaves.
        track("answer_stopped", {
          waited_ms: turnStartedAt ? Date.now() - turnStartedAt : null,
          chars_received: streamTarget ? streamTarget.length : 0
        });
        if (abortController) {
          try { abortController.abort(); } catch (e) {}
        }
      } else {
        send();
      }
    }

    function setLoading(v) {
      loading = v;
      if (v) {
        waitingSince = Date.now();
        // Nothing else repaints between "sent" and the first token, so the
        // caption needs its own nudge to appear.
        if (waitingTimer) clearTimeout(waitingTimer);
        waitingTimer = setTimeout(function () {
          waitingTimer = null;
          if (loading) renderMessages();
        }, WAITING_CAPTION_MS + 20);
      } else {
        waitingSince = 0;
        if (waitingTimer) { clearTimeout(waitingTimer); waitingTimer = null; }
      }
      updateSendState();
      renderMessages();
    }

    function startRevealLoop() {
      if (streamRevealActive) return;
      streamRevealActive = true;
      function tick() {
        if (!streamRevealActive) return;
        if (streamRevealed < streamTarget.length && streamMsgIdx >= 0 && messages[streamMsgIdx]) {
          var remaining = streamTarget.length - streamRevealed;
          var step = Math.max(3, Math.min(8, Math.ceil(remaining * 0.08)));
          streamRevealed = Math.min(streamRevealed + step, streamTarget.length);
          messages[streamMsgIdx].content = streamTarget.slice(0, streamRevealed);
          renderMessages();
        }
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    function stopRevealLoop() {
      streamRevealActive = false;
      if (streamMsgIdx >= 0 && messages[streamMsgIdx] && streamTarget) {
        messages[streamMsgIdx].content = streamTarget;
        renderMessages();
      }
      streamTarget = "";
      streamRevealed = 0;
      streamMsgIdx = -1;
    }

    // ── File attachments ─────────────────────────────────────────────────────
    // Mirrors the full-page implementation in layouts/chatbot/single.html. Kept
    // duplicated rather than shared because the two UIs share no code at all and
    // the class conventions differ (shadow-DOM bare classes vs gk- prefixed IDs).
    // NOTE: below 600px the full-page chat is display:none and the widget is
    // force-opened fullscreen, so THIS is the mobile upload path.

    var UPLOAD_URL_EP = String(config.apiUrl).replace(/\/api\/chat$/, "/api/upload-url");
    var UPLOAD_PREP_EP = String(config.apiUrl).replace(/\/api\/chat$/, "/api/upload-prepare");
    var pending = [];

    // Mirrors the server limits in src/lib/uploads/storage.ts (gking-avatar-v3).
    // Duplicated because the two live in separate repos. The server re-checks
    // everything, so a stale copy here only costs a slower, less specific
    // rejection — it can never let an over-limit file through.
    var MAX_ATTACHMENTS = 3;
    // text is the server's MAX_TEXT_CHARS (a byte length despite the name), not
    // its looser MAX_BYTES.text — pre-checking the tighter of the two here is
    // what makes the message specific instead of a generic server rejection.
    var MAX_BYTES = { pdf: 10485760, image: 5242880, tabular: 10485760, text: 40000 };
    var EXT_KIND = {
      pdf: "pdf", png: "image", jpg: "image", jpeg: "image", webp: "image",
      gif: "image", csv: "tabular", xlsx: "tabular", txt: "text", md: "text"
    };

    function showUploadError(msg) {
      errTextEl.textContent = msg;
      errEl.classList.remove("warn");
      errEl.classList.add("show");
    }
    // Non-fatal notes returned by /api/upload-prepare in `warnings[]` — the
    // widget previously discarded these entirely, so the user never learned that
    // e.g. a scanned PDF would be read as page images.
    function showUploadNote(msg) {
      errTextEl.textContent = msg;
      errEl.classList.add("warn");
      errEl.classList.add("show");
    }
    function clearUploadError() {
      errEl.classList.remove("show");
      errEl.classList.remove("warn");
      errTextEl.textContent = "";
    }
    shadow.querySelector(".upload-err-x").addEventListener("click", clearUploadError);

    // Pre-flight check, so an obviously-too-big file fails instantly instead of
    // after a full upload. Type is re-checked here because the input's `accept`
    // attribute only filters the OS picker — drag-drop and paste bypass it.
    function localRejection(file) {
      var ext = (file.name.split(".").pop() || "").toLowerCase();
      var kind = EXT_KIND[ext];
      if (!kind) {
        return "“" + file.name + "” isn’t a supported file type. " +
          "You can attach PDF, CSV, XLSX, TXT, MD, PNG, JPG, WEBP or GIF files.";
      }
      if (file.size > MAX_BYTES[kind]) {
        return "“" + file.name + "” is " + fmtBytes(file.size) +
          " — the limit is " + fmtBytes(MAX_BYTES[kind]) + " for this file type.";
      }
      return null;
    }

    function anyUploading() {
      return pending.some(function (p) { return p.status === "uploading" || p.status === "preparing"; });
    }
    function readyAttachments() {
      return pending.filter(function (p) { return p.status === "ready"; })
                    .map(function (p) { return p.prepared; });
    }
    function fmtBytes(n) {
      if (!n && n !== 0) return "";
      if (n < 1024) return n + " B";
      if (n < 1048576) return Math.round(n / 1024) + " KB";
      return (n / 1048576).toFixed(1) + " MB";
    }
    function chipIcon(kind) {
      if (kind === "image") return "🖼";
      if (kind === "tabular") return "📊";
      return "📄";
    }
    function chipMeta(p) {
      if (p.status === "uploading") return "uploading " + (p.pct || 0) + "%";
      if (p.status === "preparing") return "reading…";
      if (p.status === "error") return p.error || "failed";
      var d = p.prepared || {};
      if (d.pages) return d.pages + (d.pages === 1 ? " page" : " pages");
      return fmtBytes(p.size);
    }
    function chipsHtml(items, readonly, expired) {
      return items.map(function (p) {
        var cls = "chip" + (p.status === "error" ? " error" : "") + (expired ? " expired" : "");
        var bar = p.status === "uploading"
          ? '<div class="chip-bar" style="width:' + (p.pct || 0) + '%"></div>' : "";
        var x = readonly ? ""
          : '<button class="chip-x" type="button" data-chip="' + escapeHtml(p.id) + '" aria-label="Remove">&times;</button>';
        return '<div class="' + cls + '"' + (expired ? ' title="No longer attached"' : "") + ">" +
          '<span class="chip-icon">' + chipIcon(p.kind) + "</span>" +
          '<span class="chip-name">' + escapeHtml(p.name) + "</span>" +
          '<span class="chip-meta">' + escapeHtml(expired ? "no longer attached" : chipMeta(p)) + "</span>" + x + bar + "</div>";
      }).join("");
    }
    function renderChips() {
      chipsEl.innerHTML = chipsHtml(pending, false);
      updateSendState();
    }
    chipsEl.addEventListener("click", function (e) {
      var btn = e.target.closest && e.target.closest(".chip-x");
      if (!btn) return;
      var id = btn.getAttribute("data-chip");
      var p = pending.filter(function (x) { return x.id === id; })[0];
      if (p && p.xhr) { try { p.xhr.abort(); } catch (err) {} }
      pending = pending.filter(function (x) { return x.id !== id; });
      clearUploadError();
      renderChips();
    });

    // XHR, not fetch: fetch has no upload-progress event.
    function putWithProgress(p, url, file, contentType, onPct) {
      return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        p.xhr = xhr;
        xhr.open("PUT", url, true);
        xhr.setRequestHeader("Content-Type", contentType);
        xhr.upload.onprogress = function (ev) {
          if (ev.lengthComputable) onPct(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload = function () {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error("upload failed (" + xhr.status + ")"));
        };
        xhr.onerror = function () { reject(new Error("network error during upload")); };
        xhr.onabort = function () { reject(new Error("aborted")); };
        xhr.send(file);
      });
    }

    async function startUpload(file) {
      var p = { id: uuid(), name: file.name, size: file.size, kind: "text", status: "uploading", pct: 0 };
      pending.push(p);
      renderChips();
      try {
        var r = await fetch(UPLOAD_URL_EP, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: ensureConversationId(),
            filename: file.name,
            size: file.size
          })
        });
        if (r.status === 403) {
          // Kill switch is on — stop offering uploads rather than failing repeatedly.
          attachBtn.hidden = true;
          pending = pending.filter(function (x) { return x.id !== p.id; });
          renderChips();
          return;
        }
        var meta = await r.json();
        if (!r.ok) throw new Error(meta.message || "not supported");
        p.kind = meta.kind;
        renderChips();

        await putWithProgress(p, meta.url, file, meta.media_type, function (pct) {
          p.pct = pct; renderChips();
        });

        p.status = "preparing"; renderChips();
        var pr = await fetch(UPLOAD_PREP_EP, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversation_id: ensureConversationId(), key: meta.key })
        });
        var prep = await pr.json();
        if (!pr.ok) throw new Error(prep.message || "could not read the file");
        p.prepared = {
          key: prep.key, file_id: prep.file_id, filename: prep.filename,
          kind: prep.kind, media_type: prep.media_type,
          pages: prep.pages, chars: prep.chars, indexed: prep.indexed
        };
        p.warnings = prep.warnings || [];
        p.status = "ready";
        // The upload feature shipped with no instrumentation; these two events
        // are the whole picture of whether it works for real users.
        track("file_upload", {
          outcome: "ready", kind: p.kind, size: p.size,
          pages: prep.pages || null, warnings: (p.warnings || []).length
        });
        if (p.warnings.length) showUploadNote(p.warnings.join(" "));
      } catch (err) {
        var msg = err && err.message ? err.message : "Upload failed.";
        p.status = "error";
        track("file_upload", {
          outcome: msg === "aborted" ? "cancelled" : "error",
          kind: p.kind, size: p.size, reason: msg.slice(0, 200)
        });
        // The chip is narrow, so it gets a clipped version; the banner below the
        // chips carries the server's full explanation of which limit was hit.
        p.error = msg.slice(0, 60);
        // "aborted" is the user removing the chip mid-upload, not a failure.
        if (msg !== "aborted") showUploadError("“" + p.name + "” — " + msg);
      }
      renderChips();
    }

    function attachFiles(list) {
      clearUploadError();
      for (var i = 0; i < list.length; i++) {
        // startUpload pushes onto `pending` synchronously, so this stays accurate
        // across the loop even though the uploads themselves are in flight.
        if (pending.length >= MAX_ATTACHMENTS) {
          showUploadError("You can attach up to " + MAX_ATTACHMENTS + " files at a time.");
          break;
        }
        var bad = localRejection(list[i]);
        if (bad) { showUploadError(bad); continue; }
        startUpload(list[i]);
      }
    }

    attachBtn.addEventListener("click", function () { fileInput.click(); });
    fileInput.addEventListener("change", function () {
      if (fileInput.files && fileInput.files.length) attachFiles(fileInput.files);
      fileInput.value = "";
    });
    ["dragenter", "dragover"].forEach(function (ev) {
      panel.addEventListener(ev, function (e) {
        if (!e.dataTransfer || Array.prototype.indexOf.call(e.dataTransfer.types || [], "Files") === -1) return;
        e.preventDefault(); panel.classList.add("dragging");
      });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      panel.addEventListener(ev, function (e) {
        if (ev === "dragleave" && e.relatedTarget && panel.contains(e.relatedTarget)) return;
        panel.classList.remove("dragging");
      });
    });
    panel.addEventListener("drop", function (e) {
      if (!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) return;
      e.preventDefault();
      attachFiles(e.dataTransfer.files);
    });
    textarea.addEventListener("paste", function (e) {
      if (!e.clipboardData || !e.clipboardData.files || !e.clipboardData.files.length) return;
      attachFiles(e.clipboardData.files);
    });

    async function send() {
      var text = textarea.value.trim();
      var atts = readyAttachments();
      if ((!text && !atts.length) || loading || anyUploading()) return;
      if (!text && atts.length) text = "Please take a look at this.";
      textarea.value = "";
      ensureConversationId();

      turnStartedAt = Date.now();
      firstTokenAt = null;
      if (trackerReady) T.noteMessageSent();
      // Length and turn index only — the question text already lives in the
      // server-side turn log and does not need a second, unreviewed copy.
      track("message_sent", {
        chars: text.length,
        attachments: atts.length,
        turn_index: messages.filter(function (m) { return m.role === "user"; }).length + 1
      });

      var userMsg = { id: uuid(), role: "user", content: text, at: Date.now() };
      if (atts.length) {
        userMsg.attachments = atts;
        // Display copy — `attachments` is the wire format sent to the backend
        // verbatim, so nothing UI-only may be added to it.
        userMsg.attachmentChips = pending
          .filter(function (p) { return p.status === "ready"; })
          .map(function (p) {
            return { id: p.id, name: p.name, kind: p.kind, size: p.size, status: "ready", prepared: p.prepared };
          });
        pending = [];
        clearUploadError();
        renderChips();
      }
      messages.push(userMsg);
      // Save the question before the answer exists: a tab closed mid-answer
      // should still leave the conversation in the archive.
      persist();
      setLoading(true);

      abortController = new AbortController();
      try {
        var res = await fetch(config.apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            botId: config.botId,
            messages: messages,
            conversation_id: ensureConversationId(),
            source: "embed",
            // Campaign + viewport the server can't see, so the turn log carries
            // the same attribution fields as the beacon events.
            client_context: T.clientContext ? T.clientContext() : undefined
          }),
          signal: abortController.signal
        });

        var ct = res.headers.get("Content-Type") || "";
        if (ct.indexOf("text/event-stream") !== -1 && res.body && res.body.getReader) {
          var reader = res.body.getReader();
          var decoder = new TextDecoder();
          var buffer = "";
          messages.push({ id: uuid(), role: "assistant", content: "" });
          var idx = messages.length - 1;
          streaming = true;
          setLoading(false);

          // The step thread hangs off the message itself, so renderMessages()
          // can rebuild it from state on every frame without any DOM-held
          // state to lose. onReveal is a no-op here: this surface already
          // repaints continuously while streaming.
          if (window.GKSteps) messages[idx].steps = window.GKSteps.create();

          // Hand the assistant slot to the rAF reveal loop.
          streamTarget = "";
          streamRevealed = 0;
          streamMsgIdx = idx;
          startRevealLoop();

          while (true) {
            var chunk = await reader.read();
            if (chunk.done) break;
            buffer += decoder.decode(chunk.value, { stream: true });
            var lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (var i = 0; i < lines.length; i++) {
              var line = lines[i];
              if (line.indexOf("data: ") !== 0) continue;
              try {
                var evt = JSON.parse(line.slice(6));
                if (evt.type === "token" && evt.content) {
                  if (firstTokenAt === null) firstTokenAt = Date.now();
                  streamTarget += evt.content;
                } else if (evt.type === "attached_figures") {
                  messages[idx].figures = Array.isArray(evt.figures) ? evt.figures : [];
                } else if (evt.type === "previews") {
                  messages[idx].previews = Array.isArray(evt.items) ? evt.items : [];
                } else if (evt.type === "step") {
                  if (messages[idx].steps) messages[idx].steps.addStep(evt.id, evt.label);
                } else if (evt.type === "step_done") {
                  if (messages[idx].steps) messages[idx].steps.completeStep(evt.id);
                } else if (evt.type === "done") {
                  if (messages[idx].steps) messages[idx].steps.finish(evt.worked_ms, evt.step_count);
                } else if (evt.type === "meta") {
                  messages[idx].meta = evt;
                }
                // NOTE: unknown event types fall through this chain silently,
                // on purpose. gking-site is served statically and a cached
                // bundle can lag a backend deploy by days, so tolerating events
                // it has never heard of is load-bearing. Do not turn this into
                // a switch with a throwing default.
              } catch (e) {
                // skip malformed events
              }
            }
          }

          stopRevealLoop();
          // A stream can end without ever sending `done` (dropped connection,
          // Lambda timeout). Sealing is what stops a step's dot breathing
          // forever — the one failure of this feature a user can see.
          if (messages[idx].steps) messages[idx].steps.seal();
          if (!messages[idx].content) {
            messages[idx].content = "Sorry, I couldn't generate a response.";
          }
          streaming = false;
          updateSendState();
          maybeShowSessionRating();
          renderMessages();
          noteAnswerComplete("sse", messages[idx]);
        } else {
          var data;
          try {
            data = await res.json();
          } catch (e) {
            data = null;
          }
          var reply =
            (data && (data.reply || data.message || data.response)) ||
            "Sorry, I couldn't generate a response.";
          var figs = data && Array.isArray(data.figures) ? data.figures : [];
          var previews = data && Array.isArray(data.previews) ? data.previews : [];
          messages.push({ id: uuid(), role: "assistant", content: reply, figures: figs, previews: previews });
          maybeShowSessionRating();
          setLoading(false);
          noteAnswerComplete("json", messages[messages.length - 1]);
        }
      } catch (e) {
        var wasAbort =
          e && (e.name === "AbortError" || /aborted/i.test(String(e.message || "")));
        stopRevealLoop();
        // Same reason as the clean-exit seal above: abort and network error
        // both leave any in-flight step open.
        for (var si = 0; si < messages.length; si++) {
          if (messages[si] && messages[si].steps) messages[si].steps.seal();
        }
        streaming = false;
        if (wasAbort) {
          var last = messages[messages.length - 1];
          if (last && last.role === "assistant" && !last.content) {
            last.content = "_(stopped)_";
          }
        } else {
          console.error("[GKing Chat Widget] request error:", e);
          // Client-visible failures were previously invisible in the data —
          // there was no error rate at all. Reason only, never the user's text.
          track("error", {
            where: "send",
            name: (e && e.name) || "Error",
            message: String((e && e.message) || e).slice(0, 200),
            waited_ms: turnStartedAt ? Date.now() - turnStartedAt : null
          });
          messages.push({
            id: uuid(),
            role: "assistant",
            content: "Sorry, something went wrong. Please try again."
          });
        }
        setLoading(false);
      } finally {
        abortController = null;
        /* One save site for every ending: the clean SSE exit, the non-SSE
           JSON reply, an aborted turn (which leaves "_(stopped)_") and a
           network error (which leaves an apology) are all real history. */
        persist();
        if (histOpen) renderHistory();
      }
    }

    /* Fired once per completed answer: perceived latency (time to first token)
       alongside total time, then starts measuring how long the answer is
       actually read — the missing denominator for the citation click rate. */
    function noteAnswerComplete(mode, msg) {
      if (trackerReady) T.noteAnswerReceived();
      track("answer_received", {
        mode: mode,
        first_token_ms: (firstTokenAt && turnStartedAt) ? firstTokenAt - turnStartedAt : null,
        total_ms: turnStartedAt ? Date.now() - turnStartedAt : null,
        chars: (msg && msg.content) ? msg.content.length : 0,
        figures: (msg && msg.figures) ? msg.figures.length : 0,
        previews: (msg && msg.previews) ? msg.previews.length : 0
      });
      if (trackerReady) {
        try {
          var nodes = messagesEl.querySelectorAll(".msg.bot");
          var el = nodes[nodes.length - 1];
          if (el) T.trackAnswerDwell(el, { messageId: msg && msg.id });
        } catch (e) {}
      }
      turnStartedAt = null;
      firstTokenAt = null;
    }

    btn.addEventListener("click", function () {
      setOpen(!open);
    });

    // ── History drawer wiring ───────────────────────────────────────────
    histBtn.addEventListener("click", function () { setHistoryOpen(!histOpen); });
    histCloseBtn.addEventListener("click", function () { setHistoryOpen(false); });
    histScrim.addEventListener("click", function () { setHistoryOpen(false); });
    histNewBtn.addEventListener("click", function () {
      newConversation();
      setHistoryOpen(false);
      if (!isMobileViewport()) setTimeout(function () { textarea.focus(); }, 0);
    });

    /* Two-step, in place. A window.confirm() would block every subsequent
       browser event the extension-driven page relies on, and a native dialog
       over a shadow-root widget reads as a browser warning rather than as
       part of the chat. */
    histClearBtn.addEventListener("click", function () {
      if (!HIST) return;
      if (!clearArmed) {
        clearArmed = true;
        histClearBtn.textContent = "Delete all?";
        histClearBtn.classList.add("confirm");
        setTimeout(function () { if (clearArmed) resetClearConfirm(); }, 4000);
        return;
      }
      HIST.clear().then(function () {
        resetClearConfirm();
        newConversation();
        renderHistory();
      });
    });

    histListEl.addEventListener("click", function (ev) {
      var ren = ev.target && ev.target.closest ? ev.target.closest("[data-hist-ren]") : null;
      if (ren) {
        ev.stopPropagation();
        startRename(ren.closest("[data-hist-id]"));
        return;
      }
      var del = ev.target && ev.target.closest ? ev.target.closest("[data-hist-del]") : null;
      if (del) {
        ev.stopPropagation();
        var delId = del.getAttribute("data-hist-del");
        HIST.remove(delId).then(function () {
          // Deleting the conversation you are sitting in leaves the transcript
          // on screen but unowned; start a clean one instead.
          if (delId === conversationId) newConversation();
          renderHistory();
        });
        return;
      }
      var item = ev.target && ev.target.closest ? ev.target.closest("[data-hist-id]") : null;
      if (item) restoreConversation(item.getAttribute("data-hist-id"));
    });

    /* Rename in place. Driven by the pencil rather than a double-click on the
       row: the row's own click restores the chat and rebuilds the list, which
       would pull the input out from under the second click. */
    function startRename(item) {
      if (!item) return;
      var titleEl = item.querySelector(".hist-title");
      if (!titleEl || titleEl.querySelector("input")) return;
      var id = item.getAttribute("data-hist-id");
      var current = titleEl.textContent;
      var input = document.createElement("input");
      input.type = "text";
      input.value = current;
      input.className = "hist-rename";
      titleEl.textContent = "";
      titleEl.appendChild(input);
      input.focus();
      input.select();
      var settled = false;
      function commit(save) {
        if (settled) return;
        settled = true;
        var next = input.value.replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
        var keep = (save && next) ? next : current;
        // Put the plain title back first: renderHistory() bails out while an
        // input is still in the list, so it cannot be what removes it.
        titleEl.textContent = keep;
        if (save && next && next !== current) HIST.rename(id, next).then(renderHistory);
        else renderHistory();
      }
      input.addEventListener("mousedown", function (e) { e.stopPropagation(); });
      input.addEventListener("click", function (e) { e.stopPropagation(); });
      input.addEventListener("blur", function () { commit(true); });
      input.addEventListener("keydown", function (e) {
        e.stopPropagation();
        if (e.key === "Enter") { e.preventDefault(); commit(true); }
        else if (e.key === "Escape") { e.preventDefault(); commit(false); }
      });
    }

    shadow.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && histOpen) { setHistoryOpen(false); ev.stopPropagation(); }
    });

    closeBtn.addEventListener("click", function () {
      setOpen(false);
    });
    expandBtn.addEventListener("click", function () {
      setFullscreen(!fullscreen);
    });
    minimizeBtn.addEventListener("click", function () {
      setOpen(false);
    });
    sendBtn.addEventListener("click", handleSendClick);
    textarea.addEventListener("input", updateSendState);
    textarea.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendClick();
      }
    });
    /* chat_focus / first_keystroke / message_abandoned — the three events that
       separate "never considered asking" from "started typing and gave up".
       Deferred until gk-track.js is present, since it owns the listeners. */
    (function bindComposerWhenReady() {
      if (trackerReady) { T.bindComposer(textarea); return; }
      setTimeout(bindComposerWhenReady, 250);
    })();
    /* Copying an answer is a strong value signal and needs no new UI — the
       browser's own copy event tells us. Length only; never the text. */
    messagesEl.addEventListener("copy", function () {
      try {
        var sel = String((shadow.getSelection && shadow.getSelection()) || document.getSelection() || "");
        track("copy_answer", { chars: sel.length });
      } catch (e) {}
    });

    messagesEl.addEventListener("click", function (e) {
      var target = e.target;
      while (target && target !== messagesEl && !target.getAttribute("data-action")) {
        target = target.parentNode;
      }
      if (!target || target === messagesEl) return;
      var action = target.getAttribute("data-action");
      var msgId = target.getAttribute("data-msg-id");
      var msgIdxAttr = target.getAttribute("data-msg-idx");
      var msgIdx = msgIdxAttr == null ? null : parseInt(msgIdxAttr, 10);
      if (!msgId) return;

      if (action === "sr-rate") {
        if (sessionRating.rated) return;
        var srValue = target.getAttribute("data-sr-value");
        sessionRating.rated = srValue;
        sessionRating.commentOpen = srValue !== "good";
        postFeedback(
          buildFeedbackPayload({
            messageId: "session",
            ratedIndex: null,
            feedbackType: "session_rating",
            rating: srValue
          })
        );
        track("rating_submitted", { kind: "session", rating: srValue });
        if (!sessionRating.commentOpen) hideSessionRatingSoon();
        renderMessages();
        return;
      } else if (action === "sr-dismiss") {
        sessionRating.dismissed = true;
        postFeedback(
          buildFeedbackPayload({
            messageId: "session",
            ratedIndex: null,
            feedbackType: "session_rating_dismissed",
            rating: null
          })
        );
        track("rating_submitted", { kind: "session", rating: "dismissed" });
        renderMessages();
        return;
      } else if (action === "sr-comment-cancel") {
        sessionRating.commentOpen = false;
        sessionRating.commentDraft = "";
        hideSessionRatingSoon();
        renderMessages();
        return;
      } else if (action === "sr-comment-send") {
        var srTa = messagesEl.querySelector("[data-sr-textarea]");
        var srComment = srTa ? srTa.value.trim() : "";
        sessionRating.commentOpen = false;
        sessionRating.commentDraft = "";
        sessionRating.commentSent = true;
        if (srComment) {
          postFeedback(
            buildFeedbackPayload({
              messageId: "session",
              ratedIndex: null,
              feedbackType: "session_comment",
              rating: sessionRating.rated,
              comment: srComment
            })
          );
        }
        hideSessionRatingSoon();
        renderMessages();
        return;
      }

      if (action === "rate-up" || action === "rate-down") {
        if (feedbackState[msgId] && feedbackState[msgId].rated) return;
        var rating = action === "rate-up" ? "up" : "down";
        feedbackState[msgId] = {
          rated: rating,
          commentOpen: rating === "down",
          commentDraft: "",
          commentSent: false
        };
        postFeedback(
          buildFeedbackPayload({
            messageId: msgId,
            ratedIndex: msgIdx,
            feedbackType: "rating",
            rating: rating
          })
        );
        // A thumbs rating should survive a reload the way the answer does.
        persist();
        renderMessages();
      } else if (action === "comment-cancel") {
        if (feedbackState[msgId]) {
          feedbackState[msgId].commentOpen = false;
          feedbackState[msgId].commentDraft = "";
        }
        renderMessages();
      } else if (action === "comment-send") {
        var ta = messagesEl.querySelector('[data-comment-textarea="' + msgId + '"]');
        var commentText = ta ? ta.value.trim() : "";
        if (!feedbackState[msgId]) feedbackState[msgId] = {};
        feedbackState[msgId].commentOpen = false;
        feedbackState[msgId].commentDraft = "";
        feedbackState[msgId].commentSent = true;
        if (commentText) {
          postFeedback(
            buildFeedbackPayload({
              messageId: msgId,
              ratedIndex: msgIdx,
              feedbackType: "comment",
              rating: feedbackState[msgId].rated || null,
              comment: commentText
            })
          );
        }
        renderMessages();
      }
    });

    function openFeedbackModal() {
      modalTextarea.value = "";
      modalOverlay.hidden = false;
      setTimeout(function () {
        modalTextarea.focus();
      }, 0);
    }
    function closeFeedbackModal() {
      modalOverlay.hidden = true;
    }
    generalFeedbackBtn.addEventListener("click", openFeedbackModal);
    modalCancelBtn.addEventListener("click", closeFeedbackModal);
    modalSendBtn.addEventListener("click", function () {
      var text = modalTextarea.value.trim();
      if (!text) {
        closeFeedbackModal();
        return;
      }
      postFeedback(
        buildFeedbackPayload({
          messageId: "general",
          ratedIndex: null,
          feedbackType: "general",
          rating: null,
          comment: text
        })
      );
      closeFeedbackModal();
    });
    modalOverlay.addEventListener("click", function (e) {
      if (e.target === modalOverlay) closeFeedbackModal();
    });

    window.GKingChat = {
      __mounted: true,
      open: function () {
        setOpen(true);
      },
      close: function () {
        setOpen(false);
      },
      toggle: function () {
        setOpen(!open);
      },
      /* Abandons the current conversation; it does NOT erase it. The
         transcript was already saved on its last completed turn and stays in
         the history list — only an explicit delete or Clear removes data. */
      reset: function () {
        newConversation();
      },
      newChat: function () {
        newConversation();
      },
      /* Lets the /ask-gary mobile takeover reach history without a second
         implementation: below 600px the full-page chat is hidden and this
         widget is what the visitor is actually using. */
      history: {
        open: function () { setHistoryOpen(true); },
        close: function () { setHistoryOpen(false); },
        list: function () { return HIST ? HIST.list() : Promise.resolve([]); },
        resume: function (id) { restoreConversation(id); },
        available: function () { return !!HIST; }
      },
      config: config
    };

    /* The widget is now on the page but closed. This is the impression the
       funnel was missing: previously the only widget event fired on OPEN, so
       there was no denominator for "how many people saw it and ignored it". */
    track("widget_impression", { version: WIDGET_VERSION });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
