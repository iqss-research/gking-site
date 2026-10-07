# Build My Academic GitHub Pages Website

## Who I Am

[Replace this section with ONE of the following options. If the owner handed you a filled-in information form, that form is the source of truth — use it and ignore this blank template.]

**Option A — Upload your materials:**
- Name:
- Title/Position:
- Institution:
- **Homepage intro blurb** (2–4 sentences for the hero section — who you are, what you work on, written in the third person):
- **Full bio** (longer narrative for the Bio/CV page — can be multiple paragraphs, covers career arc, research interests in depth, key contributions):
- Photo (attach file, or URL to your institutional headshot):
- Email / contact info:
- Publications list (attach BibTeX file, CV PDF, or paste here):
- Presentations/talks (attach or paste):
- Software projects (if any):
- Datasets (if any):
- Teaching history (if any):
- Research group / lab members (if any):
- Research areas / topics (list 3–8):
- Any other sections you want (startups, consulting, media, etc.):

> **Important:** The homepage intro and the bio page MUST use different text. The intro blurb is a brief orientation for first-time visitors; the bio is a full narrative. Never reuse the same text in both places — redundant text makes a site feel unfinished.

**Option B — Scrape my existing website:**
- URL of my current academic website:
- Anything on the old site that should be changed, dropped, or reorganized:
- Any new content not on the old site (attach or paste):
- **Homepage intro blurb** (2–4 sentences for the hero section):
- **Full bio** (longer narrative for the Bio/CV page):

> **Important:** These two texts MUST be distinct — never reuse the same paragraph for both. If the person leaves these blank, check whether the old site has clearly different text for each. If the old site only has one bio paragraph, use it for the Bio page and either ask the person to write a separate short intro, or insert a `[PLACEHOLDER]` on the homepage and flag it for them. Do NOT silently duplicate the same text in both places.

---

## What I Want

Build me a complete, deployment-ready academic personal website using Hugo + Hugo Blox (Tailwind) + Pagefind, deployed via GitHub Pages with GitHub Actions. The site should be ready to push to a new GitHub repo and go live.

The result must be aesthetically polished, informationally dense, well-organized, accessible, and maintainable by a non-technical academic who edits Markdown on GitHub.

---

## Architecture Requirements

### Tech Stack (non-negotiable)

| Layer | Choice | Why |
|-------|--------|-----|
| Static site generator | **Hugo** (extended) | Fast, one binary, first-class academic theme ecosystem, no Node build pipeline for content. |
| Theme | **Hugo Blox** (`blox-tailwind` v0.10.0+) via Go module | Academic-CV-ready partials, taxonomy, author cards, search modal, Tailwind pipeline. |
| CSS | Tailwind via Blox + a single `assets/css/custom.css` for overrides | Tailwind for quick styling, custom.css for project-specific semantic classes. |
| Search | **Pagefind** (static, WASM-based) | No search server; index built in CI; works on GitHub Pages. |
| Hosting | **GitHub Pages** project site (`username.github.io/repo/`) | Free, versioned, identical to dev. |
| CI | GitHub Actions | Build Hugo → build Pagefind → deploy pages artifact. |
| Vendored theme | `_vendor/` (Hugo module vendor) | Freezes theme version; allows searching/copying vendor templates. |

Create a `go.mod` that imports Blox modules:

```go
module github.com/ORG/REPO-site
go 1.22
require (
  github.com/HugoBlox/hugo-blox-builder/modules/blox-tailwind v0.10.0
)
```

Run `hugo mod vendor` to lock it into `_vendor/`.

### Directory Structure

```
hugo-site/
├── assets/css/custom.css           # all project-level style overrides
├── content/
│   ├── _index.md                   # homepage (type: landing)
│   ├── publication/                # papers, books, datasets, reports
│   ├── talk/                       # presentations
│   ├── software/                   # tools, packages
│   ├── authors/                    # auto-generated profile per co-author + listed group members (this is the People page)
│   ├── bio/                        # bio & CV
│   ├── teaching/                   # courses
│   ├── research-areas/             # topic landing pages
│   └── contact/                    # contact page
├── data/                           # structured JSON/YAML (legacy maps, featured lists)
├── i18n/en.yaml                    # centralized label overrides
├── layouts/
│   ├── _partials/                  # overridden Blox partials
│   │   ├── components/search-modal.html
│   │   ├── components/headers/navbar.html
│   │   ├── related_finder.html
│   │   └── site_footer.html
│   ├── _default/single.html
│   ├── publication/{list,single}.html
│   ├── talk/{list,single}.html
│   ├── software/{list,single}.html
│   ├── landing/list.html           # homepage layout
│   ├── baseof.html
│   └── shortcodes/staticrel.html
├── static/
│   ├── files/                      # PDFs, supplementary downloads
│   └── images/                     # non-content images (bio photo, logos)
├── _vendor/                        # hugo mod vendor output (checked in)
├── go.mod, go.sum
├── hugo.yaml
├── package.json                    # just for `npx pagefind`
├── .github/workflows/deploy.yml
├── UPDATING.md                     # owner-facing guide for adding content
└── WEBSITE_PRINCIPLES.md           # architecture playbook for future AI maintenance
```

**Rule for overrides:** if you need to customize a Blox partial, copy it from `_vendor/.../layouts/_partials/<path>` to `layouts/_partials/<path>` and edit there. Hugo picks the project copy. Hugo Blox uses `layouts/_partials/…`, NOT `layouts/partials/…` — getting this wrong means the override is silently ignored.

### hugo.yaml Essentials

```yaml
baseURL: "https://USERNAME.github.io/REPO/"  # MUST end with slash
title: "Full Name"
languageCode: en-us

module:
  imports:
    - path: github.com/HugoBlox/hugo-blox-builder/modules/blox-tailwind

outputs:
  home: [HTML, RSS, JSON]

params:
  appearance:
    theme_day: custom
    theme_night: custom
    color_mode: light
    font: native
    font_size: L
  header:
    navbar:
      enable: true
      show_search: true
  features:
    search:
      provider: flexsearch  # Blox default; Pagefind works via overridden modal
  extensions:
    css:
      - css/custom.css

taxonomies:
  tag: tags
  category: categories
  publication_type: publication_types
  author: authors

permalinks:
  publication: /publication/:slug/
  talk: /talk/:slug/
  software: /software/:slug/

menu:
  main:
    - name: Bio & C.V.
      url: /bio/
      weight: 10
    - name: Writings
      url: /publication/
      weight: 20
    - name: Research Areas
      url: "/#research-areas"
      weight: 30
    - name: Software
      url: /software/
      weight: 40
    - name: People
      url: /authors/       # People page = styled profile cards (override the term template); NEVER the raw name+publication-count list
      weight: 50
    - name: Teaching
      url: /teaching/
      weight: 60
    - name: Contact
      url: /contact/
      weight: 70
```

---

## Content Model

Every content type is a **directory** containing `index.md` (or `_index.md` for list/root pages and `authors/`). The **directory name is the permanent slug** and appears in the URL. Never rename a directory once the site is live.

### Publications, Talks, Software — shared front-matter shape

```yaml
---
title: "Paper Title"
date: YYYY-MM-DD
authors: ["First Last", "First Last"]
publication_types: ["journal_article"]
publication: "Journal Name, Vol(Issue), Pages"
abstract: "..."
links:
  - name: Article
    url: "files/paper.pdf"
  - name: Publisher's Version
    url: "https://doi.org/..."
tags: ["causal inference", "machine learning"]
---
```

#### Controlled vocabulary for `publication_types`

| Value | Used for |
|-------|----------|
| `journal_article` | Peer-reviewed journal papers |
| `book` | Monographs, edited volumes |
| `book_chapter` / `chapter` | Chapters in edited volumes |
| `report` | Working papers, tech reports, white papers |
| `patent` | Patents |
| `court_brief` | Amicus briefs, legal filings |
| `data` | Datasets (companion to a paper or standalone) |
| `software` | Software write-ups published as papers |
| `presentation` | Talks (these go in `content/talk/`) |

- `links` with `name` + `url` render as styled buttons. `url` starting with `files/…` points at `static/files/`.
- Featured image: drop `featured.jpg` or `featured.png` next to `index.md` — the layout auto-discovers it via `partial "functions/get_featured_image.html"`.
- **Do NOT display the `publication_types` label on individual publication pages.** Labels like "Journal Article", "Book Chapter", "Report" are internal taxonomy values used for filtering on the list page — they are redundant and ugly when shown on the publication's own page. The reader already knows what kind of thing they're looking at from the context (the venue, the navigation breadcrumb, the page structure). The single-page layout should show title, authors, date, venue, abstract, links, and See Also — never a badge or label reading "book_chapter" or "journal_article".

### Publisher Links and Cover Images — Automatic Discovery

For every publication, **find its page on the publisher or journal website** and include:

1. **Publisher link.** Search for the paper by title and authors on the publisher's site (e.g. Cambridge University Press, Oxford University Press, Wiley, Springer, Elsevier, JSTOR, SSRN, arXiv). Add a `links:` entry with `name: "Publisher's Version"` pointing to the canonical publisher URL. If a DOI is available, use the `https://doi.org/...` URL. This is in addition to any locally-hosted PDF.

2. **Publisher/journal cover image.** Find whatever image the publisher or journal uses to represent the publication — this could be the journal issue cover, the book cover, or a paper thumbnail/header image. Download it and save as `featured.jpg` (or `featured.png`) in the publication's content directory alongside `index.md`. This image will be auto-discovered by the layout and displayed on the publication's page.

   - For books: use the book cover image from the publisher's page or Amazon.
   - For journal articles: use the journal's cover image for that issue, or the article's header/thumbnail if the publisher provides one.
   - For working papers/reports: use any thumbnail provided by the hosting platform (SSRN, NBER, etc.), or omit if none exists.

3. **Provenance.** If the image is from a publisher, add `image_credit: "Cover image from [Publisher Name]"` in front matter for attribution. Use this **only** for a clean publisher/journal attribution. Never use it to record where you found the file or that it came from a legacy/archive scrape (e.g. "Legacy thumbnail from the Princeton Scholar archive") — that is internal commentary, not attribution. If there is no clean publisher attribution, omit the field.

This should be done during the initial build. The goal is that every publication page feels complete and visually grounded, with a direct path to the official published version.

### Datasets are publications

Datasets use `publication_types: [data]` with two optional fields:

```yaml
dataverse_url: "https://doi.org/10.7910/DVN/XXXXX"
dataverse_name: "Replication Data for: Paper Title"
related_paper: "paper-slug"  # renders a "Replication data for:" banner
```

### People — auto-generate from co-authorship, presented well

The site **must always include a People page** at `/authors/`, linked from the main nav — even for a solo researcher with no lab. It is generated automatically and is not optional. Collect the unique set of co-authors across all publications/talks/software (everyone listed in any `authors:` field except the site owner). **Never build this page from the raw Hugo `author` taxonomy** — that emits one bland term page per name, an unstyled wall of names each trailed by a publication count (`Jane Doe 1`, `John Smith 13`). Either drop the `author: authors` taxonomy or render People from a dedicated section/template so you control the markup.

**Automatically find and link each person's best external page (best effort).** For every co-author, search for the person and attach the first link you can verify, in this order of preference:

1. **Personal / academic website** (their own domain or department faculty page they maintain).
2. **University / department directory page** (their official institutional listing).
3. **LinkedIn** profile.

Use the highest-priority link found; if none can be verified, list the person without a link rather than guessing (flag it in an HTML comment for the owner). Resolve these once and store them so the page regenerates as new papers add new co-authors.

**This auto-resolution is fallible — do not present it as authoritative, and tell the owner to check it.** Name searches collide (e.g. recording "Jonathan Schell" when the co-author is "Julie Schell") and URLs go stale or point at the wrong person. Two requirements:

- **Disambiguate using context** before recording a link — match on the co-author's field, institution, and the actual co-authored paper, not just the name string. When you are not confident, leave the link off and flag the name in an HTML comment rather than recording a likely-wrong URL.
- **Warn the owner.** In your build summary/handoff and in the owner's `UPDATING.md`, state clearly that the People page is **auto-populated from co-authorship and its links were guessed by web search, so the owner should review every entry and fix or remove any wrong person or URL.** Keep this warning in the handoff and `UPDATING.md` — not as visible copy on the public page.

Then choose **one of two presentations — pick based on the owner**:

**Presentation A — profile cards (for labs, groups, or anyone with students / advisees / postdocs).** Auto-generate a profile page for every co-author plus any group members the owner explicitly listed. Each person gets their own page under `content/authors/<slug>/`:

```yaml
# content/authors/jane-doe/_index.md
---
title: "Jane Doe"
role: "Associate Professor, MIT"      # affiliation/title if known; omit if unknown
user_groups: ["Collaborators"]         # e.g. "Current Members", "Alumni", "Collaborators"
superuser: false
website: "https://janedoe.org"         # external link, from the priority order above
---
```

Avatar is `avatar.jpg` alongside the `_index.md` (the layout shows a neutral monogram when missing). The page must be a clean, intentional layout — profile cards or rows showing avatar/monogram, name, affiliation, and the external link — grouped by `user_groups` so the owner's own group reads first, broader co-authors after. Co-author names on each publication link to these profile pages.

**Presentation B — names-only list (for a solo researcher with no lab).** Skip per-person profile pages entirely. Render the co-authors as a single clean, alphabetized list where **each entry is just the person's name, as a link** to their resolved external page. Store the resolved links in a data file so the page never goes stale — `data/coauthors.json`, keyed by exact author name:

```json
{
  "Gary King":    { "url": "https://gking.harvard.edu/", "type": "website" },
  "Diana Mutz":   { "url": "https://web.sas.upenn.edu/mutz/", "type": "website" },
  "Donald Green": { "url": "https://polisci.columbia.edu/content/donald-p-green", "type": "university" }
}
```

The template auto-discovers the co-author set from content and looks up each name in this file. **Render only the names — as links. Do not print the link type ("Website", "University page", "LinkedIn") or any label, badge, or note beside the name**; the link itself is sufficient, and a visible label that isn't itself a link is just clutter. The preference order decides *where* the name points, not what is displayed.

**Whichever presentation you use, the page copy reads like a website, not like these instructions.** The People intro (and every section intro/subtitle) must be natural prose a reader would expect on a personal academic site — e.g. "Libby's research is highly collaborative; these are her co-authors." Never describe the page's own mechanics or restate this prompt (no "each name links to their website, university page, or LinkedIn"). Describe the people, not the UI.

### Homepage

```yaml
# content/_index.md
---
title: "Full Name"
type: landing
---
```

The `landing/list.html` layout renders: hero section with bio photo + brief intro, and research areas below displayed as **collapsible dropdown accordions** — each research area is a clickable header that expands to reveal its associated publications, talks, and software. Do NOT list all publications flat under each area; use a compact summary (3–5 featured items per area) with a "View all →" link to the filtered writings page. This keeps the homepage scannable rather than overwhelming.

### Homepage Layout Rules

The homepage hero holds the photo and the text block (name, title, institution, intro, buttons). **Its arrangement comes from the design brief drawn in the quest** (see *Design quest* under *CSS / Styling Approach*; <https://gking.harvard.edu/mysite/files/QUEST_DESIGN.md>) — one of fifteen arrangements: photo left, photo right, centered, a narrow column, a banner, text-first, a wordmark, or a first screen built around a still or moving graphic made from the owner's own work (a figure, a timeline of papers, a map, a coauthor network, a key result, a topic field, a slideshow, a grid). Do not default to photo-left-text-right out of habit.

- On mobile (≤ 640px), whatever the arrangement, stack vertically (photo on top, text below, centered).
- The photo's shape and size come from the brief (circle, square, rounded, arched, or natural aspect; about 180–240px on desktop), aligned with the top of the text block when side by side.
- Whatever the arrangement, it must still read as a professional academic page: the name and affiliation are the first things a reader sees, and the intro is not pushed below the fold.
- **The "Research Areas" nav link (`/#research-areas`) must scroll to the TOP of the research-areas section, not the bottom of the page.** Put `id="research-areas"` on the section's heading/wrapper and give it `scroll-margin-top` equal to the fixed navbar height so the section lands just below the navbar. A frequent bug is the anchor jumping to the page bottom (id placed after the section, or the fixed header not accounted for) — verify the click lands on the section heading.
- **Style links and buttons consistently within a section.** Don't render some actions as buttons while their siblings are plain text links — e.g. don't make "Bio & C.V." a button while "View all →" is an unstyled link. Choose one treatment for primary actions and one for inline links and apply them uniformly, or the page looks half-finished.

### Navbar Layout Rules (DO NOT CHANGE)

The navbar **must** follow this structure:

- **Brand = the owner's full name (uppercase, bold)** on the far LEFT. This is mandatory and automatic on every page — the brand is the owner's name (e.g. "LIBBY JENKE"), **not** a logo placeholder, not the word "Home", and never left blank. Set it explicitly (in Hugo Blox, `params.header.navbar.logo.text: "Full Name"`); do not rely on a theme default that renders an empty brand when no logo image is configured.
- **The brand name must be a clickable link to the homepage** (`href="/"`), present in the navbar on *every* page so a reader can always click the name to return home. Verify after building that the brand text actually appears and that clicking it loads the homepage — an empty or missing brand is a bug.
- **Navigation links** flush to the RIGHT (no large gap between brand and nav items).
- **Search** represented as a **plain magnifying glass icon only** — no text label, no button border/background. Just the icon, clickable.
- **The header's horizontal padding must match its vertical padding** on desktop, so the bar feels balanced — align the brand and nav with the page's content gutter rather than letting them sit flush against the window edges.
- On mobile, nav links collapse into a hamburger menu. **Keep the brand top-left and the hamburger toggle aligned to the far RIGHT — never floating in the center of the bar.** When opened, it expands into a clean, full-width stacked menu (one link per row, generous tap targets), not a misaligned, half-width, or overlapping dropdown. Verify the collapsed and expanded states at 375px.
- The bar's colours, typeface and weight come from the design brief; its structure (above) does not.

---

## Automatic "See Also" Cross-Linking

This is the critical feature that makes the site self-maintaining. Implement a `layouts/_partials/related_finder.html` that runs at Hugo build time on every publication/talk/software page.

### Algorithm

**Priority 1 — Explicit overrides always win.** Honor front-matter fields:
- `related_papers: [slug, slug, ...]`
- `related_talks: [slug, slug, ...]`
- `related_software: [slug, slug, ...]`
- `related_datasets: [slug, slug, ...]`
- Legacy singular: `related_paper: slug`, `related_dataset: slug`

**Priority 1b — `see_also` front matter.** List of `{url, title}` for external links or `{section, slug}` for internal links not covered by the related_* fields.

**Priority 1c — `dataverse_url`.** If present, surface as a `[Dataset]` row in See Also.

**Priority 2 — Category siblings.** Every entry sharing the same subcategory in `data/research_areas.json` is added.

**Priority 3 — Automatic scoring backfill.** For every other page across publication/talk/software sections:
- **+2** per overlapping **title token** (lowercased, stop words stripped, tokens < 3 chars dropped)
- **+1** per shared **author** (exact full-string match, or last-name fuzzy match for cases like "Jonathan Katz" vs "Jonathan N. Katz")
- **+2** per shared **tag/keyword**
- Pages above threshold are included (threshold = 4 normally, relaxed to 2 if fewer than 3 explicit picks)

**Stop words to strip from title tokens:** a, an, and, the, of, for, in, on, to, with, by, at, as, is, are, be, or, from, into, using, via, new, not, no, it, its, we, our, their, you, your, this, that, these, those, but, if, than, then, so, can, will, would, could, should, may, might, also, more, most, some, all, any, each, every, who, whom, which, what, when, where, why, how, about, between, among, through, over, under, after, before, upon, across, per, vs, de, la, les, et, du

**Rendering rules:**
- Cap at 8 total results, sorted by score desc then year desc
- Label each item: `[Paper]`, `[Presentation]`, `[Software]`, `[Dataset]`, `[Book]`, `[Patent]`, `[Court Brief]`
- Title-level dedup: normalize titles to lowercase alphanumeric and skip duplicates (catches same work appearing in both `/publication/` and `/software/`)
- Label precedence: check `publication_types` before section name — a file under `/publication/` might actually be a book, software, patent, or dataset

**Special recognition patterns to implement:**
- **Response/comment papers:** If a title starts with "Response to", "Reply to", "Comment on", or "Rejoinder", find the subject paper by title-keyword overlap and pin it at the top of See Also.
- **Book editions:** If two books share the same base title (stripping ", New Edition" / ", 2nd Edition" / etc.), cross-link them automatically.
- **Inline Dataverse URLs:** If the abstract contains a Harvard Dataverse URL but no `dataverse_url` field is set, extract and surface it as a `[Dataset]` row.

### Why this design

- **No scripts.** Lives entirely in Hugo templates; rebuilds happen in CI automatically.
- **Owner does nothing.** Upload a new paper, get cross-links automatically.
- **Full control when needed.** Front matter overrides always win.
- **No stale data files.** A Python-generated `related_map.json` would go out of date the moment you add a paper and forget to re-run the script.

---

## Writings List Page — The Centerpiece

The `/publication/` page must be a **dense, client-side-filtered list** — NOT a card grid. This is the most important page on any academic site.

### Required UI components

1. **Sticky tabbed navigation** at the top: Articles, Books, Presentations, Reports, Software, etc. Tabs are driven by `publication_types` or a legacy category map in `data/writings_legacy_map.json`. The tab strip has an opaque white background so content scrolls beneath it. Note: the tab is "Articles" (not "Journal Articles") — concise and inclusive of all article-length publications. **Each tab MUST be a clickable button with a JS event listener that filters the visible publication list to only show items matching that tab's category. An "All" tab shows everything. Tabs that do nothing when clicked are a critical bug.**

2. **Sidebar filters** (sticky, positioned below tabs):
   - Text search input (searches title, author, venue, abstract)
   - **Research area dropdown** (collapsible `<select>` or custom dropdown listing research areas from `data/research_areas.json`; selecting an area filters to publications tagged with that area's subcategories)
   - Type sub-filter (checkboxes, shown only when a tab has subtypes)
   - Year filter (checkboxes with scrollable container, max-height 200px). Lay each row out as `[checkbox] [label]` on one line — checkbox first, vertically centered with its year label, matching the type sub-filter checkboxes. A common bug is the checkbox drifting to the far right or misaligning with the label inside the scrollable container; pin them together (e.g. a flex row with a small gap) so every row reads cleanly.
   - Reset button

3. **Sort controls**: dropdown with options — Newest first (default), Oldest first, Title A–Z, Title Z–A

4. **Result count**: "X of Y results" — updates live as filters narrow the visible set

5. **Download citations** button: exports BibTeX for currently visible results

6. **URL hash sync**: changing tabs or filters updates `location.hash` so filtered views are shareable and the back button works. Hash-based routing for tabs (e.g. `#articles`, `#book`, `#presentation`).

7. **Dense citation rows**: Each publication rendered as a single citation line — authors, year, title (linked), venue — separated by border-bottom hairlines. Target ~25 items visible per screen at reasonable zoom. NOT cards, NOT grids.

8. **Server-rendered HTML**: All entries present in the DOM at page load so content is visible if JS fails. JS enhances with filtering/tabs but doesn't create the content.

9. **Vanilla JS implementation**: No framework. Serialize all pages to a JSON array in the Hugo template, then filter/render client-side with a single inline IIFE.

### Implementation pattern

**Critical: Tabs MUST actually filter content.** This is the most common failure mode — tabs render visually but clicking them does nothing. The implementation below is non-negotiable.

#### Step 1: Hugo template renders ALL items with data attributes

Every publication item in the DOM must carry a `data-tab` attribute indicating which tab it belongs to. This is how the JS knows what to show/hide.

```go
{{ $entries := slice }}
{{ range $pubPages }}
  {{ $entries = $entries | append (dict
    "title" .Title
    "slug" (path.Base (path.Dir .File.Path))
    "url" .RelPermalink
    "date" (.Date.Format "2006")
    "authors" (.Params.authors | default slice)
    "publication" (.Params.publication | default "")
    "abstract" (.Params.abstract | default "")
    "pubTypes" (.Params.publication_types | default slice)
    "legacyTab" (... lookup from writings_legacy_map ...)
  ) }}
{{ end }}
```

Each rendered HTML item must include:
```html
<article class="pub-item" data-tab="articles" data-year="2026" data-types='["journal_article"]'>
  ...citation content...
</article>
```

#### Step 2: Tab buttons use a shared data attribute for their target

```html
<nav class="pub-tabs" role="tablist">
  <button class="tab-btn active" data-tab="all" role="tab" aria-selected="true">All</button>
  <button class="tab-btn" data-tab="articles" role="tab" aria-selected="false">Articles</button>
  <button class="tab-btn" data-tab="under-review" role="tab" aria-selected="false">Under Review</button>
  <button class="tab-btn" data-tab="working-papers" role="tab" aria-selected="false">Working Papers</button>
  <button class="tab-btn" data-tab="book" role="tab" aria-selected="false">Books</button>
</nav>
```

Tab names are defined by the site owner. The `data-tab` value on each button must match the `data-tab` values on the publication items it should show.

#### Step 3: Vanilla JS IIFE handles click → filter → show/hide

This is the minimum viable filtering logic. It MUST be present and functional:

```js
(function() {
  var data = /* Hugo-injected JSON array */;
  var tabs = document.querySelectorAll('.tab-btn');
  var items = document.querySelectorAll('.pub-item');
  var countEl = document.querySelector('.result-count');

  function filterByTab(tabId) {
    var visible = 0;
    items.forEach(function(item) {
      var show = (tabId === 'all') || (item.dataset.tab === tabId);
      item.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    if (countEl) countEl.textContent = visible + ' of ' + items.length + ' results';

    // Update active tab styling
    tabs.forEach(function(btn) {
      var isActive = btn.dataset.tab === tabId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // Sync URL hash
    history.replaceState(null, '', '#' + tabId);
  }

  // Attach click handlers to every tab button
  tabs.forEach(function(btn) {
    btn.addEventListener('click', function() {
      filterByTab(btn.dataset.tab);
    });
  });

  // On page load, check hash and activate that tab (or default to "all")
  var hash = location.hash.replace('#', '') || 'all';
  filterByTab(hash);
})();
```

#### Step 4: Tab-to-type mapping

The mapping from tab names to `publication_types` values must be defined clearly. If a `data/writings_legacy_map.json` exists, use its `tab` field. Otherwise, the default mapping is:

| Tab button `data-tab` | Shows items where `publication_types` includes |
|---|---|
| `all` | (everything) |
| `articles` | `journal_article` |
| `under-review` | `under_review` (or items with `status: under_review` in front matter) |
| `working-papers` | `report`, `working_paper` |
| `book` | `book`, `book_chapter` |
| `presentations` | `presentation` |
| `software` | `software` |
| `patents` | `patent` |
| `court-briefs` | `court_brief` |
| `data` | `data` |

The site owner defines which tabs appear and what they're called. Not every site needs all tabs — only show tabs for types that actually have content.

#### Common failures to avoid

- **Tabs render but have no event listeners.** Every `<button class="tab-btn">` MUST have a click handler attached via JS.
- **Items missing `data-tab` attribute.** Every publication `<article>` in the DOM MUST carry `data-tab="..."` matching one of the tab IDs.
- **Hash routing not connected.** On page load, read `location.hash` and call the filter function immediately — don't wait for a click.
- **"All" tab doesn't reset.** The "All" tab must show every item regardless of type.
- **Active tab not visually indicated.** The currently active tab must have a distinct style (bold, underline, background change) via an `.active` class.

---

## Subpath-Safe URLs

This is the **#1 cause of 404s** on GitHub Pages project sites. Project sites live under `/REPO/`, so any literal `/files/foo.pdf` or `import('/pagefind/pagefind.js')` resolves to the host root, not the project path.

### Rules

1. **Never write `/foo` literally** in content or templates if it needs to resolve under `baseURL`.

2. **In templates**, use `relURL` WITHOUT a leading slash:
   ```go
   {{ "pagefind/pagefind.js" | relURL }}    {{/* yields /REPO/pagefind/... */}}
   ```
   Hugo's docs are explicit: `relURL "/x"` strips the base path; `relURL "x"` keeps it.

3. **In content Markdown**, never write `/files/foo.pdf`. Use the shortcode:
   ```
   {{</* staticrel "files/foo.pdf" */>}}
   ```

4. **For images in content**:
   ```markdown
   ![figure]({{</* staticrel "files/figure.png" */>}})
   ```

5. **The `staticrel` shortcode** (`layouts/shortcodes/staticrel.html`):
   ```html
   {{- (.Get 0) | relURL -}}
   ```

6. **Fix Pagefind** in the overridden search modal — change the hard-coded import to:
   ```go
   import('{{ "pagefind/pagefind.js" | relURL }}')
   ```

7. **Do not put a leading `/` on `url:` in front-matter `links:`**. The page-links partial resolves `files/foo.pdf` correctly; `/files/...` bypasses the base path.

---

## CSS / Styling Approach

> **If the owner pasted a link to a website whose design they like, fetch that page first and use its design as the visual model for the whole site** — match its layout, typography, spacing, structure, and overall colour feel, adapting it to the owner's content. A pasted reference site takes precedence over the design quest and the guidance below.

### Design quest — run it before writing any CSS

Every site built from these instructions should look like its owner's, not like the last one built. Left alone, an AI assistant gives everyone the same cream page with a round photo on the left, so the look is **drawn at random, then refined**, following the method in <https://garyking.org/quest>. Before you write `custom.css` (and after you have the owner's content), download <https://gking.harvard.edu/mysite/files/QUEST_DESIGN.md> with `curl` (a page-fetch tool may summarise it and lose its word list) and follow it: run its small script three times for three random design briefs, write three concepts from them, replace any that is too close to a site already listed in the mysite directory or to another of the three, show the owner three previews of their home page, build the full site in the one they choose, and record the seed in `hugo.yaml` under `params.mysite.design`. The sections below give the token names, the components, and the rules that never change; the **values** (colours, typeface, hero arrangement, photo shape, heading style, how the accent is used) come from the brief. Because Hugo Blox keeps a top navigation bar, read a "left sidebar" page structure in the draw as "two columns: content plus a narrow aside". Skip the quest when the owner pasted a reference site, and when migrating an existing site (14.7: keep the legacy site's structure and accent) unless the owner asked for a new look.

### Colour Philosophy

The site must feel **aesthetically cohesive** — every colour belonging with every other, as on one page of a well-designed book. Warm or cool, paper or stone, light-with-a-dark-band or plain white is the brief's call. These rules hold for every brief:

- **One family.** The accent colour, link colour, heading colour, button colour, and footer colour must all belong to the same tonal family. If the institution's brand colour is bright, desaturate it or use it sparingly as a highlight, not as a dominant surface.
- **No "web default" colours.** Reject pure blue `#0000ff`, neon greens, electric purples, bootstrap grey, or any colour that feels like a government form or a 2003 website.
- **Institution colour as accent, not takeover.** Use the institution's official colour (e.g. Harvard crimson, Stanford cardinal) for subtle accents: link hover states, thin rules, active tab underlines. Never flood the page with it. The institution colour should feel like a monogram, not a paint job.
- **Links readable but not garish.** A link colour that coordinates with the palette, visibly distinct from body text, with WCAG AA contrast on the background.
- **Surfaces are deliberate.** The background is whatever the brief drew — warm off-white, cool grey-white, plain white, or a pale wash — and cards and sidebars sit one step away from it in the same family. Do not reach for cream because it is familiar.

### custom.css requirements

The single `assets/css/custom.css` file must implement:

1. **Colour palette tokens** — CSS custom properties defining the full coordinated palette: `--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-accent`, `--color-link`, `--color-link-hover`, `--color-border`, with the values from the design brief. All must belong to the same tonal family. Include the institution's brand colour as `--color-institution` used sparingly.

2. **Link color** — A coordinated link colour from the brief's palette (not generic blue). Must have sufficient contrast (WCAG AA) against the background. Hover state shifts toward the institution accent.

3. **Forced light mode** — Override `.dark` and `html.dark` backgrounds/text back to light surfaces. Hide the theme toggle (`.theme-toggle`, `button[accesskey="t"]`). The site should always appear light.

4. **Dense citation list styles** — `.view-citation` forced to `display: block`, `.pub-list-item` as single-column list items with `border-bottom` separators.

5. **Card hover effects** — `translateY(-2px)`, softer shadow, border color shift, `0.18s` transitions. Respect `prefers-reduced-motion: reduce` by stripping transforms.

6. **Typography scale** — Publication/citation metadata at `0.88–0.95rem` with `line-height: 1.25–1.6`. Body text at comfortable `line-height: 1.5–1.6`.

7. **Responsive breakpoints** — Float-to-stack for publication images below 640px. Column stacking for sidebar filters on narrow screens. `1200px` max content width.

8. **Accessibility** — Skip-to-content link, `:focus-visible` outlines in a palette colour with at least 3:1 contrast (not neon yellow), `.sr-only` utility class, keyboard-friendly dropdowns with `focus-within`.

9. **Prose spacing** — `.prose p { margin-bottom: 1.25em }` for readable long-form content.

10. **Sticky tab strip** — Background matching `--color-bg`, subtle bottom shadow, `z-index: 20`.

11. **Sidebar filters** — Subtle border, corner radius from the brief, `--color-surface` background, sticky positioning below tabs.

12. **Button styles** — One treatment for primary actions and one for inline links, as the brief's "how the accent colour is used" says (filled accent buttons, outlined buttons, or bracketed text labels); cite buttons as a muted chip.

13. **See Also section** — `.gk-see-also` with kind labels `[Paper]`, `[Dataset]`, etc. in a distinct style.

14. **Footer** — Colours from the brief (a dark band in `--color-text` with light text, or the page background with a top hairline), site navigation links. Include, in small print at the bottom right, a credit line: `Created using <a href="https://garyking.org/mysite">GaryKing.org/mysite</a>` (only the `GaryKing.org/mysite` text is the link; "Created using" is plain). This credit appears **exactly once**, in the persistent site footer that shows on every page — **do not also print it at the end of the homepage/research-areas content or any other page body.** Two "Created using…" lines on one screen is a bug. The credit is **on by default but opt-out**: gate it behind `params.mysite.credit` (defaulting to shown) so the owner can remove it now — via the "Footer credit" checkbox in their information form — or later by asking the agent. When the form's "Footer credit" box is unchecked, set `params.mysite.credit: false`.

    **Also add invisible metadata** in the `<head>`. This is **not** how the public directory is built — that comes only from the owner's explicit opt-in on the information form. The metadata simply lets sites built with this tool be found and supported, and provides standard structured data that helps search engines. It renders nothing visible and collects nothing. Emit two things, both gated behind `params.mysite.discovery` (on by default):

    - On **every page**, an invisible marker that survives even if the footer credit is removed:
      `<meta name="generator" content="Created using GaryKing.org/mysite (https://gking.harvard.edu/mysite)">`
    - On the **homepage only**, a `schema.org` `Person` block carrying the owner's identity as structured data (good for SEO) — name, affiliation (institution), and site URL:

      ```html
      <script type="application/ld+json">
      {"@context":"https://schema.org","@type":"Person","name":"<Full Name>","affiliation":{"@type":"Organization","name":"<Institution>"},"url":"<site URL>","isBasedOn":"https://gking.harvard.edu/mysite"}
      </script>
      ```

    This is **opt-out**: when the form's "Invisible marker" box is unchecked, set `params.mysite.discovery: false` and emit neither. Use JSON-LD, **not** visually-hidden keyword text — `display:none` text stuffed with keywords can be penalised by search engines, whereas JSON-LD is invisible to visitors, standard, and good for SEO.

---

## Design Principles

### 14.1 No Dead Ends

Every page must lead somewhere useful. A reader landing on any page (via Google, a citation, a share link) must be one glance away from:

- **A way back up.** Breadcrumbs (Home / Writings / Paper Title) or a clearly-labelled parent link. Never rely on the browser back button.
- **Related work.** Every paper/talk/software/dataset has an automatic "See Also" block. If empty, something is wrong.
- **The site's main navigation.** Top navbar present on every page.
- **Site-wide search.** Search button in navbar + `Cmd-K` / `Ctrl-K` keyboard shortcut.

The 404 page shows the navbar and a search box, not just "page not found".

### 14.2 Preserve Context; Prefer Expansion Over Navigation

- **Filter and tab changes never reload the page.** All client-side JS. Changing a filter updates the URL hash (shareable) but doesn't reset scroll position or lose other filter state.
- **Search is a modal overlay**, not a separate page. Opens on top with backdrop visible, closes on `Esc`, leaves the reader exactly where they were.
- **Expandable sections stay in place.** Don't link to another page for something that can expand inline (abstracts, author lists, citations).
- **Back button always works.** State changes use `history.pushState`. No modal stacks that trap the user.
- **Nested dialogs are banned.** If a modal opens another modal, the design has failed.

### 14.3 Single Source of Truth; Never Duplicate Information

- **Title, authors, abstract, date, venue** defined once in front matter. Every list view reads the same fields. Never type the title twice.
- **Abstract shown once per page**, not in both a sidebar and the body.
- **Homepage intro ≠ bio page.** The homepage hero gets a short intro blurb (2–4 sentences). The bio page gets a full narrative. These MUST be distinct text. Seeing the same paragraph twice on a site signals laziness and confuses readers about which page is canonical.
- **Don't render the same download button twice.** If a PDF is linked from the top button row, don't also put a text "Download PDF" link in the abstract.
- **Cross-links, not copies.** A companion dataset links to the paper (and vice versa). It doesn't re-paste the abstract.
- **Migration metadata lives in `data/`, never in content front matter.** Legacy categories, Drupal node IDs, thumbnail URLs attach by slug at build time.
- **Button labels centralized in `i18n/en.yaml`.** Never inline "Article" or "Publisher's Version" in a template.
- **No redundant text anywhere.** If you find the same sentence, paragraph, or description appearing in two places on the site, one instance must be rewritten or removed. Every piece of text should have exactly one home.

### 14.3.1 No Internal Notes, Process Commentary, or Filler Subtitles on the Site

Everything that renders on the site is read by the public. Never let your own working notes, sourcing commentary, or generic auto-written descriptions leak into visible text.

- **No process or sourcing commentary in content.** Lines like "drawn from the owner's C.V.", "public links included where a current page could be verified", "scraped from the legacy site", or "Legacy thumbnail from X's archive" describe *your* work, not the person. They must never appear in a page body, section subtitle, image caption, `summary`/`description` front matter, or `alt`/`image_credit`. Strip them.
- **Section subtitles are optional and reader-facing.** Don't auto-write a subtitle that just restates the section name (e.g. "Dense, filterable list of publications, books, reports, and working papers." or "Software projects and packages associated with [Name]'s research."). Either write a genuinely useful one-liner in the owner's voice or leave it blank. A heading with no subtitle beats filler.
- **Flags and TODOs go in non-rendering comments only.** When you need to flag a guess, a gap, or a legacy-site error for the owner, use an HTML comment `<!-- ... -->` in the Markdown, or a `[PLACEHOLDER]` the owner will obviously see and replace — never a sentence that ships as live copy.
- **`image_credit` is a clean publisher attribution or nothing** (see above).
- **Before declaring the site done, read every rendered page** and delete any text that explains how the site was built or where its content came from.

### 14.4 Stable, Meaningful URLs — Forever

Academic pages are cited in papers that outlive the website. URLs are a contract.

- **Directory name = permanent slug.** Never rename a folder once live. If the title changes, edit `title:` in front matter but keep the folder.
- **Carry the legacy site's slugs through verbatim** when migrating. Every publication/talk/software folder named with the exact slug the old site used.
- **Centralized redirects.** For arbitrary short URLs, maintain one `data/redirects.yaml` that non-technical owners can edit. For per-page short URLs, use Hugo's `aliases:` in front matter.
- **No URL-visible IDs.** Slugs are human-readable kebab-case, not numeric keys or hashes.
- **Deep links work.** `…/publication/<slug>/#abstract` lands scrolled to the abstract. No JS routers that discard hash fragments.

### 14.5 Information Density Over Whitespace

Academic readers want **more on the screen**, not less. Reject marketing defaults.

- No hero sections on content pages.
- Dense citation lists (author, year, title, venue in one line) — NOT card grids with one paper per row.
- Whitespace between logical sections, not padded around every line of text.
- Writings page shows ~25 items per screen at reasonable zoom.
- If pagination is needed, it's after 100+, not after 10.

### 14.6 Scannable Structure; Labels Over Ornament

- Every link carries a **type label**: `[Paper]`, `[Talk]`, `[Software]`, `[Dataset]`, "Harvard Dataverse", "Publisher's Version", "Supplementary Material". The reader never has to click to find out what a link is.
- **Link text describes the destination.** Never "click here" or "read more". Prefer "Article (PDF)", "Replication data on Harvard Dataverse".
- **Headings follow strict hierarchy.** H1 per page, H2 for sections, H3 for subsections. Never skip levels for visual weight — use CSS instead.
- **Icons complement but do not replace text labels.** A lone envelope icon is ambiguous; "Email: name@university.edu" is not.

### 14.7 Preserve the Owner's Voice

- **Do not paraphrase the owner's content.** Fix only typos or ask. Paraphrased academic bios are almost always worse than the original.
- **Match the legacy site's structure when migrating.** Same tab names, same category ordering, same color accent, same button labels. Surprise is a bug.
- **When the legacy site is wrong, flag it, don't silently correct it.** Put a non-rendering HTML comment (`<!-- ... -->`) in the markdown — never visible text on the page.

### 14.8 Longevity and Self-Sufficiency

- **Everything required to render the site lives in the repo.** No CDN links that can go dark, no external iframes for primary content.
- **Search runs client-side** (Pagefind). No search server, no runtime API.
- **All PDFs live in `static/files/`.** Never link to someone else's copy.
- **The output is plain HTML + CSS + a small JS bundle.** It will render in 10 years on any browser.

### 14.9 Accessibility Is Table Stakes

- **Every image has meaningful `alt` text.** Featured thumbnails use the paper title; figures use their caption.
- **Semantic HTML.** `<nav>`, `<main>`, `<article>`, `<h1>`–`<h3>` per page. No `<div>` soup styled to look like headings.
- **Keyboard navigation.** Tab through links in reading order; `Cmd-K` opens search; `Esc` closes overlays; arrow keys navigate search results.
- **Focus states always visible.** Never `outline: none` without a replacement.
- **Contrast ratios** hit WCAG AA minimum (4.5:1 body text, 3:1 large text).
- **Skip-to-content link** at the top of every page.
- **`prefers-reduced-motion`** respected — strip transforms on hovers, limit transition properties.
- **No color-only signaling.** Draft vs published, dataset vs paper communicated with text label AND color.

### 14.10 Performance

- **HTML meaningful at first paint.** JS only for interactivity (filters, search, tabs).
- **No layout shift during load.** Every `<img>` has explicit `width`/`height`.
- **Lazy-load images below the fold.** `loading="lazy"` on everything except the first hero/featured image.
- **Pagefind loaded on first search-open, not up front.** The navbar "Search" button defers the ~200KB WASM bundle until the modal opens.
- **Minify HTML/CSS/JS in production** (already in deploy workflow).

### 14.11 Graceful Degradation

- **If JS fails**, the Writings page still shows all entries in static HTML. Filters are missing, but content isn't.
- **If Pagefind fails**, the search modal falls back to a Google `site:` search.
- **If an image 404s**, the `alt` text still communicates what was there.
- **If content is malformed**, the build fails in CI before the site is published.

### 14.12 Automation Over Discipline

Humans forget; scripts don't. Any recurring manual step is a bug.

- "See Also" is computed, not maintained.
- Thumbnails are auto-discovered via `featured.jpg` next to `index.md`.
- Deployment is on every push; nobody has to remember to deploy.
- **Anything a human has to remember to do weekly will not get done.** If a task recurs, move it into CI or a build-time template.

### 14.13 Visual Language

- **Typography:** the typeface family from the design brief. The default is the native system font stack via Blox (`font: native`); when the brief draws a serif, slab, or monospace element, self-host the font files in `static/fonts/` (two weights at most) — never load fonts from another company's server. Name the stack in `custom.css`.
- **Palette:** the brief's palette, in the `--color-*` tokens. Text and background with WCAG AA contrast; a coordinated link colour (never generic web blue); muted text for metadata; the institution accent colour used sparingly for highlights, active states, and thin rules. Special content types (datasets, software) get a soft banner in a step of the same palette.
- **Palette discipline:** Colors mean things. The link colour = clickable. The accent colour = institutional branding. Don't reuse colours for unrelated purposes. Every colour in the palette must look cohesive with every other — if you can't imagine them all on one page of a well-designed book, something is wrong.
- **No antiseptic or clinical colours.** Neon highlights, saturated primary colours, and generic "bootstrap blue" are banned. A plain white background is allowed only when the brief draws it, and then the type must carry the page (strong black, clear hierarchy) so it reads as a typeset document, not an empty form.
- **Shape:** corner radius, shadow and hairline weight from the brief (hard corners and rules for a typeset feel; 4–8px radius and soft shadows for a card feel); 1px hairlines in `--color-border` for dividers.
- **No ornamental animation.** Animated GIFs only as content (e.g. method demos), never decoration. The one exception is a first-screen graphic the design quest may draw (arrangements 8–15 in QUEST_DESIGN.md): made from the owner's own work, still by default, with gentle motion that stops under `prefers-reduced-motion`.
- **Always light mode.** Force light even when `dark` class applied; hide theme toggle.
- **Favicon: person's initials on a colored square.** Do NOT use the default Hugo Blox favicon. Generate a custom favicon (at minimum `favicon.ico` + `favicon-32x32.png` + `apple-touch-icon.png`) showing the person's initials (first letter of first name + first letter of last name, e.g. "GK" for Gary King) in bold white text, centered on a filled square using the site's accent/institution colour (`--color-accent` or `--color-institution`). Place the generated files in `static/`. The result should look like a clean monogram — the same colour that appears in the site's active tab underlines, buttons, and link hovers. This replaces the generic Blox "HB" icon that otherwise appears in the browser tab.

### 14.14 Editorial Principles

- **Say the thing once, clearly.** Bios and descriptions that repeat the same idea three ways get cut to one.
- **Active voice; present tense for current work, past for completed work.**
- **No academic hedging in interface copy.** Button says "Download PDF", not "You may wish to download the PDF".
- **Dates are unambiguous:** `Jan 2, 2026`, never `1/2/26`.
- **Author names spelled as the author spells them**, including diacritics, casing, and middle initials.
- **Copy reads like a website, never like the build instructions.** Section intros and subtitles must be natural prose a visitor would expect on a personal academic site. Never restate this prompt or narrate the page's own mechanics — no "use the tabs to filter," no "each name links to their website or LinkedIn," no "this page lists…". Describe the content (e.g. "Published articles, work under review, and ongoing projects."), then stop. If an intro explains how the UI works, rewrite it.

### 14.15 Tone — Understated, Credit-Sharing, Never Braggy

- **State what the person did, not how impressive it is.** "Honors thesis supervised by Prof. X" — not "wrote a groundbreaking thesis."
- **No intensifiers, no self-superlatives.** Strike *groundbreaking*, *pioneering*, *world-class*, *highly*, *extremely*, *exceptional* from your vocabulary.
- **Let the nouns do the work.** Harvard, a named prize, a citation count carry their own weight.
- **Share credit by default.** Name supervisors, co-authors, and labs in every description.
- **Awards listed once flatly** in an Honors section, without editorializing.
- **No humble-bragging.** "I was lucky to be selected for…" is worse than stating the fact.
- **When the CV is long, the prose is short.** The density of accomplishments is the signal; restating them in the bio dilutes it.

### 14.16 Images — Owned First, Public Web Where Necessary

- **Prefer photos the owner provides** or ones from their institutional page.
- **If no owned image exists**, pull from the public web and commit to the repo. Good sources: institutional profile pages, Wikimedia Commons, Creative Commons Flickr, publisher press kits.
- **Never hotlink.** Download the image, commit it, reference by local path.
- **Record provenance.** Non-owned images get a credit entry listing source URL, date fetched, and license.
- **Crop and optimize locally.** Portraits ~480×480 or ~720×720, under 150KB.
- **Alt text is factual, not promotional.** "Portrait of Prof. X, University Name" — not "Prof. X, distinguished professor."
- **Placeholder first, photo second.** Templates render a neutral monogram when the image is missing, so the site looks intentional during migration.
- **Portraits on homepage and bio only.** Don't decorate other pages with the owner's face.

---

## If Scraping a Legacy Website

When given a URL instead of uploaded materials:

1. **Scrape all publications** with: title, authors, year, venue, abstract, PDF links, DOI
2. **Scrape all presentations/talks** with the same fields
3. **Scrape software projects, datasets, teaching history, bio text, lab members**
4. **Download all PDFs** and place in `static/files/`
5. **Download bio photo** and place in `static/images/`
6. **Preserve the legacy site's URL slugs exactly** — every `/publication/<slug>/` must match so existing citations and bookmarks still work
7. **Build a `data/writings_legacy_map.json`** mapping each slug to its legacy category for tab filtering:
   ```json
   {
     "entries": {
       "paper-slug": { "tab": "articles", "drupal": "Journal Article" },
       "book-slug": { "tab": "book", "drupal": "Book" }
     }
   }
   ```
8. **Create proper Hugo content directories** with `index.md` for each item
9. **Flag ambiguities** — anything broken, missing, or uncertain goes in a markdown comment rather than being silently fixed
10. **Match the legacy site's structure** — same tab names, same category ordering, same button labels. Surprise is a bug; the owner should open the new site and not realize it is new.

---

## AI & Search Visibility

AI assistants (ChatGPT, Claude, Perplexity) and search engines now answer questions about scholars by crawling their sites — and they cite whichever page describes the work best in machine-readable form. The rules below make that page this site's. Every item is invisible to human visitors — no layout, text, or styling changes.

1. **One `https://` address everywhere.** `baseURL` in `hugo.yaml` must be the final public URL with `https://` — never `http://`, and never derived from a CI variable at build time (GitHub's `configure-pages` `base_url` output can resolve to `http://` and silently poison every canonical URL, `og:url`, and sitemap entry with the insecure scheme). Canonical tags and the sitemap inherit `baseURL`, so getting this one line right fixes all of them at once.

2. **robots.txt welcomes crawlers and signposts the map.** Create a `layouts/robots.txt` template with: `User-agent: *` and no blocks aimed at AI crawlers (GPTBot, ClaudeBot, PerplexityBot, etc.); a `Sitemap:` line built with `{{ "sitemap.xml" | absURL }}`; and a comment pointing to `/llms.txt`. Never `Disallow` a path that the sitemap advertises — the two files must not contradict each other (if a path is disallowed, exclude it from the sitemap too).

3. **llms.txt at the site root.** A plain-text/markdown welcome file (~10–15 lines) that AI agents look for at `/llms.txt`: one or two sentences on who the owner is (name, title, institution, research areas), then a short list of the site's key URLs (bio/CV, writings, software, teaching, contact). Write it from the same "Who I Am" facts as the rest of the site. Not linked from the nav — machines find it by convention.

4. **Scholarly metadata on every publication page.** From the same front matter each page already carries (title, authors, date, abstract, venue, links), emit in the `<head>` via a partial:
   - **Google Scholar tags:** `citation_title`, one `citation_author` per author, `citation_publication_date` (`YYYY/MM/DD`), `citation_pdf_url` (absolute URL), and `citation_doi` when a `doi.org` link exists. This is the format Google Scholar's crawler indexes.
   - **`ScholarlyArticle` JSON-LD** (use `@type: Book` for books): `headline`, author list as Person objects, `datePublished`, `abstract` (plain text — run it through `plainify | htmlUnescape` so no HTML entities leak in), `url` (the page's canonical permalink), and the DOI as `identifier`/`sameAs`.
   Skip pages the owner marked private/unlisted. Talks get the tags too if they have abstracts; use `@type: CreativeWork`.

5. **All content in the HTML, no JS-only content.** The server-rendered writings list is already required elsewhere in these instructions; it bears repeating here because JS-injected content is the single most common AI-readability failure on academic sites. A crawler that never runs JavaScript must still see every title, author list, venue, and abstract.

6. **Verify like a crawler before handing over.** After the first deploy, fetch (with `curl`, not a browser): `/robots.txt`, `/sitemap.xml` (every `<loc>` must start with `https://`), `/llms.txt`, and one publication page (must contain `citation_title` and `application/ld+json`). If any of these fail, the site looks fine to humans but is invisible where the owner's colleagues are increasingly searching.

---

## GitHub Actions Deployment

`.github/workflows/deploy.yml`:

```yaml
name: Deploy Hugo site to Pages

on:
  push:
    branches: ["main"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

defaults:
  run:
    shell: bash

jobs:
  build:
    runs-on: ubuntu-latest
    env:
      HUGO_VERSION: 0.147.0
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive
          fetch-depth: 0

      - name: Install Hugo CLI
        run: |
          wget -O ${{ runner.temp }}/hugo.deb https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_linux-amd64.deb
          sudo dpkg -i ${{ runner.temp }}/hugo.deb

      - name: Install Dart Sass
        run: sudo snap install dart-sass

      - name: Install Node.js dependencies
        run: "[[ -f package-lock.json || -f npm-shrinkwrap.json ]] && npm ci || true"

      - name: Setup Pages
        id: pages
        uses: actions/configure-pages@v5

      - name: Build with Hugo
        env:
          HUGO_ENVIRONMENT: production
          TZ: America/New_York
        run: hugo --gc --minify --baseURL "${{ steps.pages.outputs.base_url }}/"

      - name: Build Pagefind search index
        run: npx pagefind --site public

      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./public

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**Critical notes:**
- `--baseURL` uses the URL GitHub Pages provides (includes trailing slash for project sites)
- Pagefind must run **after** Hugo, against `public/`
- Commit a `package.json` containing `"devDependencies": { "pagefind": "^1.5" }`
- The `go.sum` must be checked in alongside `go.mod`, or Hugo mod verification fails in CI

---

## Things Learned the Hard Way (Feed This to the AI)

This is a checklist of pain points discovered during real builds. Every one of these has caused hours of debugging:

- [ ] `baseURL` in `hugo.yaml` **must include the `/REPO/` suffix and a trailing slash** for project Pages deployments. Missing trailing slash breaks `relURL` math.
- [ ] `relURL "/x"` returns `/x`; `relURL "x"` returns `/REPO/x`. Use the latter unless you want to escape the base path.
- [ ] Blox search modal hard-codes `/pagefind/pagefind.js`. Patch it with `{{ "pagefind/pagefind.js" | relURL }}`.
- [ ] Hugo Blox uses `layouts/_partials/…`, not `layouts/partials/…`. Getting this wrong means the override is silently ignored.
- [ ] Don't use `<iframe>` for animated GIFs on GitHub Pages project sites — `<img>` works and respects `relURL` via `staticrel`.
- [ ] Do not put a leading `/` on `url:` in front-matter `links:`. The page-links partial resolves `files/foo.pdf` correctly; `/files/...` bypasses the base path.
- [ ] Migration JSON belongs in `data/`, not in content front matter. Keeps migrations regeneratable.
- [ ] Special-case pages: branch the template on a boolean front matter flag (e.g. `quest_replica: true`) rather than forking the template.
- [ ] Write "See Also" as a single template-level partial using title-token + author + tag scoring. Do NOT introduce a Python script that writes `related_map.json` — it inevitably gets stale.
- [ ] **Publication tabs MUST have JS click handlers that actually filter items.** Rendering tab buttons without attaching event listeners is the #1 most common failure. Every `<button class="tab-btn">` needs `addEventListener('click', ...)` and every `<article>` item needs a `data-tab` attribute. Test by clicking each tab and verifying the list changes.
- [ ] **The People page is auto-populated with co-author profiles, and looks intentional.** A profile is generated for every co-author (plus any listed group members), each auto-linked to their website → university page → LinkedIn (first one found/verified). The page renders as styled profile cards grouped by `user_groups` — NOT the raw Blox taxonomy term list of names trailed by publication counts.
- [ ] **No internal notes or filler text renders anywhere.** Read every page: no process/sourcing commentary ("drawn from the C.V.", "links verified where possible", "Legacy thumbnail from …"), and section subtitles are either useful and in the owner's voice or absent.
- [ ] Pagefind must be built **after** Hugo in the Actions workflow, and before the upload-artifact step. Both against `public/`.
- [ ] Commit `_vendor/` to the repo. It's the only way to reliably override Blox partials and keeps builds hermetic.
- [ ] The `go.sum` must be checked in alongside `go.mod`, or Hugo mod verification will fail in CI.
- [ ] When a button or label needs to be renamed site-wide, change it in `i18n/en.yaml`, not the template.
- [ ] **The navbar brand must show the owner's full name and link home.** Blox renders an empty brand if no `logo.text`/`logo.filename` is set — set `params.header.navbar.logo.text: "Full Name"` explicitly and verify the name appears and clicks through to `/`.
- [ ] **Resolve co-author links into `data/coauthors.json` (website → university → LinkedIn) and never guess a URL.** For a names-only People page, render names as links with no type labels; for profile cards, set each person's `website:`. List unlinked names and flag them in a comment.
- [ ] **Co-author links are auto-guessed and often wrong — disambiguate and warn the owner to check them.** Match on field/institution/paper, not just the name (avoid "Julie Schell" → "Jonathan Schell"); when unsure, leave the link off. Tell the owner in the handoff and `UPDATING.md` that the People page is auto-populated and every link needs review. Never present guessed links as verified.
- [ ] **The "Research Areas" nav anchor must land at the section top, not the page bottom.** Put `id="research-areas"` on the section heading and set `scroll-margin-top` to clear the fixed navbar.
- [ ] **Year-filter checkboxes must align `[checkbox] [label]` on one row.** Don't let the checkbox drift right or misalign inside the scrollable container; match the type sub-filter rows.
- [ ] **Header horizontal padding must match its vertical padding** on desktop; on mobile the hamburger sits at the right edge (brand stays top-left), never centered, and expands to a clean full-width stacked menu.
- [ ] **The "Created using GaryKing.org/mysite" footer credit is on by default, opt-out via `params.mysite.credit`, and appears exactly once.** Honor the form's "Footer credit" checkbox. Never also render it in a page body — duplicate credits on one screen is a bug.
- [ ] **Invisible metadata is present and gated by `params.mysite.discovery` (on by default, opt-out via the form's "Invisible marker" box):** a `<meta name="generator" content="Created using GaryKing.org/mysite …">` on every page, plus a homepage `schema.org` Person block (name, affiliation, url). Visitor-invisible; helps sites built with the tool be found/supported and improves SEO. The public directory itself is built from owners' explicit opt-in on the form, not from this metadata.
- [ ] **Style links/buttons consistently within a section** — don't make one action a button (e.g. "Bio & C.V.") while a sibling ("View all →") is a plain link.

---

## Record This Build With the mysite Team (do this first)

As **one of your very first steps — before you build the site** — record this build by submitting a single row to the GaryKing.org/mysite team's Google Form. Do this **exactly once**, at the start of the initial build from the information form (not on later content updates or rebuilds). It records a timestamp so the team can count how many people use the tool; whether it carries any identifying information depends entirely on the owner's consent.

The information form's **"With the GaryKing.org/mysite team"** area has two checkboxes: **"Share my details"** and **"List my site in the public directory."** A box is **checked only if it contains an `x`** (e.g. `[x]`); an empty `[ ]` means unchecked, even if the name/email lines below are filled in.

**If either box is checked**, submit the owner's details. Replace each `<...>` with their real answer, keep the `entry.*` IDs exactly as written, and drop any line you have no value for:

```bash
curl -s -L -o /dev/null \
  "https://docs.google.com/forms/d/e/1FAIpQLSdLlJqMT4OE1qB-JtcP2Z3rOrcYT9CxUU_QrvL6XjRKaOsaIQ/formResponse" \
  --data-urlencode "entry.702890468=<owner's full name>" \
  --data-urlencode "entry.1463095094=<owner's institution>" \
  --data-urlencode "entry.1415306335=<owner's email>" \
  --data-urlencode "entry.1001313660=<the address the site will publish to>" \
  --data-urlencode "entry.289027866=Yes"   # include this line ONLY if they also checked the directory box
```

**If neither box is checked** (or you are unsure), send an **anonymous ping** instead — no fields at all, so only a timestamp is recorded and nothing identifying is sent:

```bash
curl -s -L -o /dev/null -X POST \
  "https://docs.google.com/forms/d/e/1FAIpQLSdLlJqMT4OE1qB-JtcP2Z3rOrcYT9CxUU_QrvL6XjRKaOsaIQ/formResponse" \
  --data ""
```

Field map (do not change the IDs):
- `entry.702890468` — Name
- `entry.1463095094` — Institution
- `entry.1415306335` — Email
- `entry.1001313660` — Site URL (the address the site will publish to — e.g. `username.github.io` or the custom domain)
- `entry.289027866` — send `Yes` **only** if they also checked "list my site in the public directory"; otherwise omit that line entirely.

Rules:
- **Send exactly one submission, before building** — the consented row if either box is checked, otherwise the anonymous timestamp ping.
- **Never send identifying data without consent**, and never submit the example placeholders or any guessed/partial data. When in doubt about a box, treat it as unchecked and send the anonymous ping only.
- If the POST fails or your environment can't run `curl`, **don't block the build** — carry on. If the owner opted to share, also give them this human-fillable form link to submit themselves: <https://docs.google.com/forms/d/e/1FAIpQLSdLlJqMT4OE1qB-JtcP2Z3rOrcYT9CxUU_QrvL6XjRKaOsaIQ/viewform>

---

## Deliverables Checklist

Produce ALL of the following:

1. **`hugo.yaml`** — complete config with all settings, menus, taxonomies, permalinks, including `params.mysite.design` (the quest's seed, priming phrase and concept)
2. **`go.mod` and `go.sum`** — importing Hugo Blox
3. **`package.json`** — with Pagefind dependency
4. **`assets/css/custom.css`** — complete project stylesheet: institution colors, forced light mode, dense citation styles, card hovers, responsive breakpoints, accessibility focus states, `prefers-reduced-motion`, See Also styling, button styles, footer
5. **All layout overrides:**
   - `layouts/baseof.html` — site shell with skip link, main block, footer
   - `layouts/_default/single.html` — generic article page with breadcrumbs, prose body, featured image, author notes, metadata grid
   - `layouts/publication/list.html` — the dense filterable Writings page with tabs, sidebar, search, sort, BibTeX download, hash routing
   - `layouts/publication/single.html` — publication detail with citation row, abstract, links, software bundle support, dataset banner
   - `layouts/talk/list.html` — presentations list
   - `layouts/software/list.html` — software list
   - `layouts/landing/list.html` — homepage with hero (photo LEFT, text RIGHT on desktop; stacked on mobile) + research area accordions
   - `layouts/_partials/components/headers/navbar.html` — brand left, nav links right, search as magnifying glass icon only, mobile hamburger
   - `layouts/_partials/components/search-modal.html` — Pagefind modal with `relURL` fix, Cmd-K shortcut, Alpine.js
   - `layouts/_partials/related_finder.html` — full auto-crosslink partial per algorithm above
   - `layouts/_partials/site_footer.html` — dark footer with site links
   - `layouts/shortcodes/staticrel.html` — subpath-safe URL shortcode
6. **`i18n/en.yaml`** — all button/label strings centralized
7. **Every content item** as a properly structured `<slug>/index.md` with full front matter
8. **All PDFs** placed in `static/files/`
9. **Bio photo** in `static/images/`
10. **Custom favicon** — person's initials on a square of the site's accent colour, placed in `static/` (favicon.ico, favicon-32x32.png, apple-touch-icon.png). Must replace the default Hugo Blox icon.
11. **`data/` files:** `research_areas.json` organizing the owner's topics into methods/applications with subcategories; `featured_publications.yaml` for working papers spotlight; if migrating: `writings_legacy_map.json`
12. **`.github/workflows/deploy.yml`** — the full Actions workflow above
13. **`UPDATING.md`** — owner-facing guide: how to add a paper, add a talk, update bio, add a person, etc. Written for a non-technical academic.
14. **`WEBSITE_PRINCIPLES.md`** — architecture playbook documenting every decision, for future AI-assisted maintenance
15. **`layouts/robots.txt`** — allows all crawlers, `{{ "sitemap.xml" | absURL }}` Sitemap line, comment pointing to `/llms.txt` (per "AI & Search Visibility")
16. **`static/llms.txt`** — the short AI-agent welcome file (per "AI & Search Visibility")
17. **Scholarly-metadata partial** — `citation_*` tags + `ScholarlyArticle` JSON-LD on every publication page (per "AI & Search Visibility")

**The site must build cleanly with `hugo --gc --minify` and deploy correctly to GitHub Pages on first push. `baseURL` must be the final `https://` URL, and every sitemap entry must inherit it.**

---

## Reproducing This Architecture — Kickstart Sequence

For a new faculty/lab site, follow this order:

> **Prerequisite — install Hugo first.** Building and previewing the site locally requires **Hugo (extended)** on the machine. Run `hugo version` to check; if it isn't installed, install it before continuing — `brew install hugo` (macOS), `winget install Hugo.Hugo.Extended` (Windows), or see <https://gohugo.io/installation/> (Linux/other). Without Hugo you can't build the local preview.

> **Step 0 — record this build first.** Before creating anything, complete the *Record This Build With the mysite Team* step above (a single form POST). Do it first so usage is captured even if the build is interrupted.

> **Before `custom.css` — run the design quest.** Download <https://gking.harvard.edu/mysite/files/QUEST_DESIGN.md> with `curl` and follow it (three random briefs, three concepts checked against the directory, three home-page previews, build the one the owner picks). Skip it if the owner pasted a reference site, or when migrating an existing site unless the owner asked for a new look.

1. `mkdir prof-site && cd prof-site && git init && gh repo create`
2. `hugo new site hugo-site` (keep the `hugo-site/` subfolder)
3. Add `hugo.yaml`, `go.mod`, `package.json` with Pagefind, and the Blox module import. Run `hugo mod vendor`.
4. Copy in `deploy.yml` and the `staticrel.html` shortcode and `related_finder.html` partial.
5. Override the Blox search modal (one-line `relURL` fix).
6. Create one example piece of content in each section (publication, talk, software, authors) as a canonical template.
7. Build the full site from the owner's materials or scraped data.
8. Commit; verify Pages deploy works; verify Pagefind finds the examples; verify "See Also" auto-links between items sharing authors.
9. Write the site-specific `UPDATING.md`.
10. Hand the owner the repo URL and the `UPDATING.md`. Done.
