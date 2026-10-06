# Build My Graduate Student Academic Website

## Who I Am

[Fill in the following fields. Leave blank any that don't apply to you. If the owner handed you a filled-in information form, that form is the source of truth — use it and ignore this blank template.]

- **Name:**
- **Department and program** (e.g., "PhD Candidate, Department of Government, Harvard University"): 
- **Year in program** (e.g., "fourth-year PhD candidate"): 
- **Advisor(s):** 
- **Committee members** (if formed):
- **Institutional affiliations** (centers, institutes, labs — e.g., "affiliate of the Institute for Quantitative Social Science"): 
- **Email:** 
- **Photo** (attach file or URL — a professional headshot or department photo):

- **One-line tagline** (the single sentence under your name — e.g., "I study the political economy of conflict, post-conflict reconstruction, and migration"): 
- **Homepage bio** (2–4 paragraphs covering: what you study, your methods, your background before the PhD, and any notable achievements — written in first or third person, your choice):


- **Research interests** (list 3–6 keywords or short phrases, e.g., "causal inference," "political communication," "time series methods"):
- **Pre-PhD education** (degrees, institutions, years — e.g., "B.S. in Computer Science, Columbia University, 2020"):
- **Pre-PhD work experience** (if relevant — industry, research positions, government, etc.):
- **Job market paper** (if applicable):
  - Title:
  - Abstract (1 paragraph):
  - PDF (attach or link):
  - Status (e.g., "under review at AJPS," "working paper"):

- **Working papers** (for each, provide: title, coauthors, one-sentence description or abstract, PDF link if available, status):

- **Published papers** (for each: title, coauthors, journal/venue, year, DOI or link):

- **Software / tools / packages** (if any — name, one-sentence description, link to repo or docs):

- **Datasets or data projects** (if any — name, description, link):

- **Teaching experience** (for each: course name, role [TA/TF/Instructor], institution, term):

- **Fellowships, grants, and awards** (list with year — e.g., "NSF Graduate Research Fellowship, 2023"):


- **Presentations and talks** (for each: title, venue/conference, date — only include if you want a dedicated section): 
- **Blog posts or analytical writing** (if any — title, date, link or attach):
- **News / recent updates** (if you want a news feed — list recent items with dates, e.g., "Paper accepted at JCR, Aug 2025"):

- **Other sections you want** (personal interests, photography, media appearances, consulting, YouTube channel, etc. — describe what you'd like): 

- **CV** (attach PDF): 

- **Social links** (any you want displayed — GitHub, Twitter/X, Google Scholar, LinkedIn, ORCID, personal blog):

> **Note on voice:** Write your bio however feels natural to you. First person ("I study...") is the norm for grad students and reads as direct and confident. Third person ("Jane studies...") is fine too, especially if you're on the job market. Either way, keep it factual and credit-sharing — name your advisors, coauthors, and funding sources.

---

## What I Want

Build me a complete, deployment-ready personal academic website using Hugo, deployed via GitHub Pages with GitHub Actions. The site should be ready to push to a `username.github.io` repo and go live immediately.

The result should be clean, minimal, professional, mobile-friendly, and easy to maintain by editing Markdown files on GitHub. It should look like the personal website of a serious graduate student — not a corporate landing page, not a flashy portfolio, not a bare-bones default template.

---

## Architecture Requirements

### Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Static site generator | **Hugo** (extended) | Fast builds, single binary, great for academic sites, no Node runtime needed for content. |
| Theme | **Minimal custom layouts** (no heavy theme framework) | Grad student sites are simple enough to not need Hugo Blox's full machinery. Lighter = easier to understand and maintain. |
| CSS | Single `assets/css/style.css` processed by Hugo Pipes | One file, no build tools, easy to customize. |
| Hosting | **GitHub Pages** user site (`username.github.io`) | Free, versioned, standard for grad students. |
| CI | GitHub Actions | Build Hugo → deploy pages artifact. |

### Directory Structure

```
site/
├── assets/
│   └── css/
│       └── style.css              # all styles
├── content/
│   ├── _index.md                  # homepage (all main content lives here)
│   ├── research/
│   │   └── _index.md              # research page (if separate from homepage)
│   ├── blog/                      # optional blog posts
│   │   ├── _index.md
│   │   └── post-slug/
│   │       └── index.md
│   └── cv/
│       └── _index.md              # CV page (or just link to PDF)
├── layouts/
│   ├── _default/
│   │   ├── baseof.html            # site shell
│   │   ├── single.html            # generic single page
│   │   └── list.html              # generic list page
│   ├── index.html                 # homepage layout
│   ├── blog/
│   │   ├── list.html              # blog index
│   │   └── single.html            # blog post
│   └── partials/
│       ├── head.html              # <head> with meta, CSS, favicon
│       ├── nav.html               # top navigation
│       └── footer.html            # site footer
├── static/
│   ├── files/                     # PDFs (CV, papers)
│   ├── images/                    # photos, project images
│   └── favicon.ico                # custom favicon
├── hugo.yaml                      # site configuration
├── .github/workflows/deploy.yml   # CI/CD
├── UPDATING.md                    # how to add/edit content
└── README.md                      # repo overview
```

### hugo.yaml Essentials

```yaml
baseURL: "https://USERNAME.github.io/"
title: "Full Name"
languageCode: en-us

params:
  description: "PhD Candidate, Department, University"
  author: "Full Name"
  email: "email@university.edu"

menu:
  main:
    - name: Research
      url: "/#research"
      weight: 10
    - name: Teaching
      url: "/#teaching"
      weight: 20
    - name: CV
      url: "/files/cv.pdf"
      weight: 30
    - name: Contact
      url: "/#contact"
      weight: 40

markup:
  goldmark:
    renderer:
      unsafe: true
```

Menu items link to sections on the homepage (anchor links) or to files. This keeps the single-page feel while maintaining navigability. Add a "Blog" or "News" menu item only if the student has that content. Each anchor link must scroll to the **top** of its target section, not the page bottom — give section targets a `scroll-margin-top` equal to the sticky nav height so the heading lands just below the nav.

---

## Content Model

### Homepage (`content/_index.md`)

The homepage is the heart of the site. It contains all primary content in sections, rendered by `layouts/index.html`. The front matter is minimal; the body is structured Markdown with heading-delimited sections that the layout renders as distinct visual blocks.

```yaml
---
title: "Full Name"
---
```

The layout template reads from `hugo.yaml` params and renders sections for: hero/bio, research, publications, teaching, awards, news, and contact. Content for each section is either in the `_index.md` body or pulled from front matter / data files as appropriate.

### Publications and Working Papers

These are listed directly in the homepage content or in a `data/papers.yaml` file for cleaner templating:

```yaml
# data/papers.yaml
- title: "Paper Title Here"
  authors: ["First Last", "First Last"]
  year: 2025
  status: "working paper"  # or: "published", "under review", "revise and resubmit"
  venue: ""  # journal name if published
  pdf: "files/paper-slug.pdf"  # local PDF path
  link: ""  # external link (DOI, publisher, SSRN)
  abstract: "One paragraph abstract."
  job_market_paper: false  # set true for THE job market paper
  tags: ["causal inference", "text analysis"]
```

**Status vocabulary:**
| Value | Meaning |
|-------|---------|
| `published` | Appeared in a peer-reviewed venue |
| `accepted` | Accepted, not yet in print |
| `revise and resubmit` | R&R at a journal |
| `under review` | Submitted and under review |
| `working paper` | Complete draft, circulating |
| `work in progress` | Early-stage, not yet circulating |

### Teaching

Listed in `data/teaching.yaml`:

```yaml
- course: "GOV 50: Data"
  role: "Teaching Fellow"
  institution: "Harvard University"
  term: "Fall 2024"
  instructor: "Prof. Name"  # optional
```

### Software / Projects

Listed in `data/projects.yaml` (if any):

```yaml
- name: "ProjectName"
  description: "One-sentence description of what it does."
  url: "https://github.com/username/project"
  language: "R"  # or Python, etc.
```

### Blog Posts

Each blog post is a content directory: `content/blog/post-slug/index.md`

```yaml
---
title: "Post Title"
date: 2025-03-15
description: "One-sentence summary."
tags: ["methodology", "tutorial"]
---
```

---

## Homepage Layout

The homepage is a single scrolling page with clearly delineated sections. This matches how nearly all grad student sites in the examples are structured.

### Section order (top to bottom):

1. **Hero / About** — Photo, name, title, department, university, 1-2 sentence research tagline, social links, CV button
2. **Bio** — 2-4 paragraphs of fuller description (research interests, methods, background)
3. **Research** — Job market paper highlighted at top (if applicable), then working papers, then publications. Each item: title (linked to PDF), coauthors, status badge, one-line description or venue.
4. **Software / Projects** — Only if they have them. Name, one-line description, link.
5. **Teaching** — Simple list: course name, role, term.
6. **Awards & Fellowships** — Compact list with years.
7. **News / Updates** — Optional. Reverse-chronological feed of recent items (talks given, papers accepted, awards received). Show 5-8 most recent.
8. **Blog** — Optional. Links to 3-5 most recent posts with dates, with "View all" link if more exist.
9. **Contact** — Email, office address if desired, social links repeated.

### Hero section layout rules

- The hero contains the photo, name, title, department, tagline, social links, and a "CV (PDF)" button. **How they are arranged — photo left, photo right, banner, text-first, or wordmark — comes from the design brief drawn in the quest (see "Design quest" below), not from habit.** Do not default to photo-left-text-right unless the brief says so.
- On mobile (≤ 768px), whatever the arrangement, stack vertically: photo on top, text below, nothing wider than the screen.
- Photo: shape and size from the brief (circle, square, rounded, arched, or natural aspect); 160–220px on desktop; `object-fit: cover` when cropped.
- The social links and the CV button sit with the name/title block, styled as the brief says (icons, bracketed text labels, or plain links).

### Research section layout rules

- **Job market paper** (if designated) gets a highlighted card: title in bold, full abstract shown, prominent PDF link, status badge. Visually distinct from other papers (subtle background, border, or left-accent bar).
- **Other papers** listed as compact rows: authors, year, "Title" (linked), status in parentheses. No abstracts shown inline (keep it scannable); link to PDF is the title itself.
- Group by status: "Working Papers" subheading, then "Publications" subheading. Only show subheadings that have content.

---

## Design Principles

> **If the owner pasted a link to a website whose design they like, fetch that page first and use its design as the visual model for the whole site** — match its layout, typography, spacing, structure, and overall colour feel, adapting it to the owner's content. A pasted reference site takes precedence over the design quest and the guidance below.

### Design quest — run it before writing any CSS

Every site built from these instructions should look like its owner's, not like the last one built. Left alone, an AI assistant gives everyone the same cream page with a round photo on the left, so the look is **drawn at random, then refined**, following the method in <https://garyking.org/quest>. Before you write a line of CSS (and after you have the owner's content), download <https://gking.harvard.edu/mysite/files/QUEST_DESIGN.md> with `curl` (a page-fetch tool may summarise it and lose its word list) and follow it: run its small script three times for three random design briefs, write three concepts from them, check them against the sites already listed in the mysite directory, build the first one that is not too close to an existing site, and record the seed in `hugo.yaml` under `params.mysite.design`. The CSS section below gives the token names and the rules that never change; the **values** (colours, typeface, hero arrangement, photo shape, heading style, page width) come from the brief. Skip the quest only when the owner pasted a reference site or asked to keep an existing site's look.

### Clean over dense

Grad student sites have little content. The design challenge is making 3 papers and 2 teaching roles look intentional and professional, not empty. Use generous whitespace, clear typography, and confident simplicity. Do NOT try to fill space with decorative elements.

### One page does the work

A visitor (faculty on a hiring committee, fellow student, conference attendee) should get the full picture without clicking away from the homepage. The only reasons to navigate away: reading a full blog post, downloading a PDF, or visiting an external link.

### Mobile-first

Grad students share their site URL on Twitter, in email signatures, and on conference name tags. More than half of visits will be on phones. Every element must work on a 375px-wide screen.

### Stable URLs

`username.github.io` is the URL that goes on your CV, your email signature, your conference papers. It must not break. Use the user-site pattern (`username.github.io`) not the project-site pattern, so there's no `/repo/` subpath complexity.

### Maintainable by the owner

A grad student should be able to add a new paper by editing `data/papers.yaml` and uploading a PDF to `static/files/` — directly on GitHub in the browser if they want. No build tools to install locally. No complex template logic to understand.

### No dead ends

Every page (including blog posts) has navigation back to the homepage. The 404 page includes navigation. External links open in new tabs. The site header shows the owner's **full name (bold)** and that name is a clickable link back to the top of the homepage on every page — set it explicitly and verify it renders; never an empty or placeholder brand.

### Understated tone

State facts. Don't editorialize accomplishments. "NSF Graduate Research Fellowship, 2023" — not "prestigious NSF fellowship." Let the nouns carry their own weight. Name advisors and coauthors. The site signals seriousness through its clarity and completeness, not through self-promotion.

### Copy reads like a website, not like the build instructions

Section intros and subtitles must be natural prose a visitor would expect on a personal academic site. Never restate this prompt or narrate the page's own mechanics — no "use the tabs to filter," no "each name links to their website," no "this section lists my papers." Describe the content plainly (e.g. "Working papers and publications.") and stop. If an intro explains how the UI works, rewrite it. When coauthors are linked, show only their names as links — no "Website"/"University page" labels beside them.

### No internal notes or filler on the site

Everything that renders is read by the public. Never let your own working notes or auto-written descriptions leak into visible text.

- **No process or sourcing commentary.** Lines like "drawn from the owner's C.V.", "links verified where possible", or "scraped from the old site" describe *your* work, not the person — never put them in a heading, subtitle, body, caption, or `description` front matter.
- **Subtitles are optional and reader-facing.** Don't auto-write a subtitle that just restates a section's name. Write a genuinely useful one-liner in the owner's voice, or leave it blank — a heading with no subtitle beats filler.
- **Flags go in non-rendering comments only.** Use an HTML comment `<!-- ... -->` or an obvious `[PLACEHOLDER]` for anything you need the owner to review — never a sentence that ships as live copy.
- **Before declaring the site done, read every page** and delete any text that explains how the site was built or where its content came from.

### Accessibility

- Semantic HTML (`<nav>`, `<main>`, `<article>`, `<section>`, proper heading hierarchy)
- All images have meaningful `alt` text
- Sufficient color contrast (WCAG AA)
- Keyboard navigable
- `prefers-reduced-motion` respected
- Skip-to-content link

### Performance

- HTML meaningful at first paint — no JS required for content
- Images lazy-loaded below the fold
- No fonts loaded from other servers. Use the system font stack, or self-host a font file in `static/fonts/` when the design brief calls for one (two weights at most) — fast, private, and still working in ten years
- Total page weight under 500KB excluding PDFs
- No JavaScript frameworks

---

## CSS / Styling

### Philosophy

The site should feel like a clean, well-typeset document — not a "website." Think: the visual clarity of a well-formatted academic CV, translated to a screen. Professional and quietly confident. Whether it is warm or cool, serif or sans, narrow or wide is decided by the design brief from the quest, and a good brief is one you can imagine as a well-designed book: every colour and shape belonging together.

### Color palette

Define the palette as CSS custom properties with these names, so the owner (or a later quest) can change the look by editing one block:

```css
:root {
  --color-bg:           /* page background — from the brief */;
  --color-surface:      /* cards and highlights, a step away from the background */;
  --color-text:         /* body text, at least 4.5:1 contrast on --color-bg */;
  --color-text-muted:   /* metadata, dates — still at least 4.5:1 */;
  --color-accent:       /* links and highlights — from the brief */;
  --color-accent-hover: /* a darker or lighter step of the accent */;
  --color-border:       /* hairlines, a step away from the background */;
  --color-highlight:    /* job market paper card background */;
  --color-institution:  /* the institution's colour, used sparingly */;
}
```

Rules that hold for every palette: all the colours belong to one family (no colour that looks borrowed from a different site); no "web default" blue (`#0000ff`), neon, or bootstrap-grey; the institution's colour is an accent, not the main surface; links are visibly different from body text; focus outlines use a palette colour with 3:1 contrast.

### Typography

- Typeface family from the brief (system sans, serif, slab, or a self-hosted pair); name the actual font stack in the CSS. Do not fall back to the system sans because it is easiest — that is the default the quest exists to avoid.
- Body: 1rem / 1.5–1.6 line-height; a text column no wider than about 75 characters.
- Name (h1): large and distinct — the brief says whether it is heavy, italic, a wordmark, or small capitals.
- Section headings (h2): styled as the brief says (small capitals, a rule, a number, a block label); keep the heading hierarchy semantic.
- Paper titles: 1rem, medium weight, `--color-accent` (they're links)
- Metadata (year, status, role): 0.875rem, `--color-text-muted`

### Key style rules

1. **Max content width:** from the brief's page structure — one narrow column (about 700px), one wide column (about 1000px), a left sidebar, two columns, or full-bleed bands. Whatever the structure, the running text column stays under about 75 characters per line.
2. **Section spacing:** `4rem` between major sections, `1.5rem` between items within a section.
3. **Links:** `--color-accent`, no underline by default, underline on hover. Visited links same color (academic sites are reference material, not reading-once content).
4. **Status badges:** Small inline labels (`font-size: 0.75rem`, uppercase, letter-spaced) next to paper titles — e.g., `UNDER REVIEW`, `R&R`, `WORKING PAPER`. Use `--color-text-muted` with a subtle background.
5. **Job market paper card:** `--color-highlight` background, `1px` left border in `--color-accent`, `1.5rem` padding.
6. **Hero photo:** shape from the brief (`border-radius: 50%` for a circle, `0` for a square, `12px` for rounded, `50% 50% 0 0` for an arch, or none); 160–220px; `object-fit: cover` when cropped.
7. **Footer:** Minimal — name, year. Same `--color-text-muted`. Include, in small print at the bottom right, a credit line: `Created using <a href="https://garyking.org/mysite">GaryKing.org/mysite</a>` (only the `GaryKing.org/mysite` text is the link; "Created using" is plain). This credit appears **exactly once**, in the persistent footer — never also at the end of the page content. The credit is **on by default but opt-out**: gate it behind `params.mysite.credit` (defaulting to shown) so the owner can remove it now — via the "Footer credit" checkbox in their information form — or later by asking the agent. When that box is unchecked, set `params.mysite.credit: false`.

    **Also add invisible metadata** in the `<head>`. This is **not** how the public directory is built — that comes only from the owner's explicit opt-in on the information form. The metadata simply lets sites built with this tool be found and supported, and provides standard structured data that helps search engines. It renders nothing visible and collects nothing. Emit two things, both gated behind `params.mysite.discovery` (on by default):

    - On **every page**, an invisible marker that survives even if the footer credit is removed:
      `<meta name="generator" content="Created using GaryKing.org/mysite (https://gking.harvard.edu/mysite)">`
    - On the **homepage only**, a `schema.org` `Person` block carrying the owner's identity as structured data (good for SEO) — name, affiliation (institution/department), and site URL:

      ```html
      <script type="application/ld+json">
      {"@context":"https://schema.org","@type":"Person","name":"<Full Name>","affiliation":{"@type":"Organization","name":"<Institution>"},"url":"<site URL>","isBasedOn":"https://gking.harvard.edu/mysite"}
      </script>
      ```

    This is **opt-out**: when the form's "Invisible marker" box is unchecked, set `params.mysite.discovery: false` and emit neither. Use JSON-LD, **not** visually-hidden keyword text — `display:none` text stuffed with keywords can be penalised by search engines, whereas JSON-LD is invisible to visitors, standard, and good for SEO.
8. **Nav:** Sticky top bar (or, if the brief chose a left sidebar, a sticky sidebar on desktop that becomes a top bar on mobile), `--color-bg` background, subtle border. Name first, links after, with **horizontal padding that matches the vertical padding** so the bar feels balanced (don't sit flush against the window edges). On mobile: a hamburger toggle pinned to the far right (name stays on the left), never floating in the center, expanding to a clean full-width stacked menu — or a simple horizontal scroll. Test the collapsed and expanded states at 375px.
9. **No dark mode.** Force light always. Grad student sites are viewed in professional contexts (committee meetings, browser tabs alongside papers). Consistency matters more than preference.
10. **Favicon:** Student's initials on a square of `--color-accent`. E.g., "NK" for Nakamura Kentaro — white bold text centered on a filled square.

---

## AI & Search Visibility

AI assistants (ChatGPT, Claude, Perplexity) and search engines now answer questions about researchers by crawling their sites. The rules below make the site fully readable to them. Every item is invisible to human visitors — no layout, text, or styling changes.

1. **One `https://` address everywhere.** `baseURL` in `hugo.yaml` must be the final public URL with `https://` — never `http://`, and never derived from a CI variable at build time (GitHub's `configure-pages` `base_url` output can resolve to `http://` and silently poison every canonical URL, `og:url`, and sitemap entry with the insecure scheme). Canonical tags and the sitemap inherit `baseURL`, so getting this one line right fixes all of them at once.

2. **robots.txt welcomes crawlers and signposts the map.** Create `static/robots.txt` (or a `layouts/robots.txt` template) with: `User-agent: *` and no blocks aimed at AI crawlers (GPTBot, ClaudeBot, PerplexityBot, etc.); a `Sitemap:` line with the absolute `https://` sitemap URL; and a comment pointing to `/llms.txt`. Never `Disallow` a path that the sitemap advertises — the two files must not contradict each other.

3. **llms.txt at the site root.** A plain-text/markdown welcome file (~8–12 lines) that AI agents look for at `/llms.txt`: one or two sentences on who the owner is (name, role, institution, research area), then a short list of the site's key URLs (home, CV, papers, contact). Write it from the same "Who I Am" facts as the rest of the site. Not linked from the nav — machines find it by convention.

4. **All content in the HTML, no JS-only content.** The papers section is server-rendered already; keep it that way, including abstracts (the `<details>` abstract text must be in the DOM at load, not fetched or injected). A crawler that never runs JavaScript must still see every paper title, author list, venue, and abstract.

5. **Structured data.** The homepage `schema.org` Person block from the invisible-metadata rule above covers identity. If the owner has real publication pages (rather than the single-page papers list), also apply the scholarly-metadata rule from the Academic form's build instructions (Google Scholar `citation_*` tags plus `ScholarlyArticle` JSON-LD per paper).

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

jobs:
  build:
    runs-on: ubuntu-latest
    env:
      HUGO_VERSION: 0.147.0
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Install Hugo CLI
        run: |
          wget -O ${{ runner.temp }}/hugo.deb https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_linux-amd64.deb
          sudo dpkg -i ${{ runner.temp }}/hugo.deb

      - name: Setup Pages
        id: pages
        uses: actions/configure-pages@v5

      - name: Build with Hugo
        env:
          HUGO_ENVIRONMENT: production
          TZ: America/New_York
        run: hugo --gc --minify --baseURL "${{ steps.pages.outputs.base_url }}/"

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

1. **`hugo.yaml`** — complete config with params, menus, markup settings, including `params.mysite.design` (the quest's seed, priming phrase and concept)
2. **`assets/css/style.css`** — complete stylesheet implementing the design brief chosen in the quest (palette, typography, layout, hero, nav, sections, status badges, job market card, responsive breakpoints, accessibility)
3. **`layouts/index.html`** — homepage layout rendering all sections (hero, bio, research, teaching, awards, news, blog teasers, contact)
4. **`layouts/_default/baseof.html`** — site shell (html, head, body, skip link, nav, main, footer)
5. **`layouts/_default/single.html`** — generic page template
6. **`layouts/_default/list.html`** — generic list template
7. **`layouts/blog/single.html`** — blog post template (if blog content exists)
8. **`layouts/blog/list.html`** — blog index template (if blog content exists)
9. **`layouts/partials/head.html`** — `<head>` with meta tags, open graph, CSS link, favicon
10. **`layouts/partials/nav.html`** — sticky navigation (name left, links right, mobile hamburger)
11. **`layouts/partials/footer.html`** — minimal footer
12. **`content/_index.md`** — homepage content with bio text
13. **`data/papers.yaml`** — all publications and working papers
14. **`data/teaching.yaml`** — teaching history
15. **`data/projects.yaml`** — software/projects (if any)
16. **`static/files/cv.pdf`** — the student's CV (from attached file)
17. **`static/files/`** — all paper PDFs
18. **`static/images/photo.jpg`** — the student's headshot
19. **Custom favicon** — initials on accent-colored square (favicon.ico, favicon-32x32.png, apple-touch-icon.png) in `static/`
20. **`.github/workflows/deploy.yml`** — the Actions workflow above
21. **`UPDATING.md`** — plain-language guide for the student: how to add a paper, update bio, add a blog post, change their photo. Written for someone who edits files on GitHub in the browser.
22. **Blog content** (if provided) — each post as `content/blog/slug/index.md`
23. **`static/robots.txt`** — allows all crawlers, `https://` Sitemap line, comment pointing to `/llms.txt` (per "AI & Search Visibility")
24. **`static/llms.txt`** — the short AI-agent welcome file (per "AI & Search Visibility")

**The site must build cleanly with `hugo --gc --minify` and deploy correctly to GitHub Pages on first push. `baseURL` must be the final `https://` URL, and every sitemap entry must inherit it.**

---

## Things That Go Wrong (So Avoid Them)

- [ ] **Empty-feeling sites.** If the student only has 2 papers and 1 TA role, the site must still look intentional. Use whitespace confidently; don't add filler sections. Hide section headings for sections with no content.
- [ ] **Broken links to PDFs.** All `href` values for local files must use Hugo's `relURL` or be relative paths. Test that `/files/cv.pdf` actually resolves.
- [ ] **Photo not displaying.** Ensure the image path in the template matches where the file actually lives in `static/`.
- [ ] **"Under construction" energy.** Never leave placeholder text visible. If a section has no content, omit it entirely — don't show an empty heading.
- [ ] **Over-engineering.** Do not add search, filtering, JavaScript interactivity, or any feature that a site with <20 content items doesn't need. Complexity is a maintenance burden for a busy grad student.
- [ ] **Treating working papers like published papers.** Always show status clearly. Never imply something is published when it's a working paper. But also don't be apologetic about working papers — they're the norm for students.
- [ ] **Forgetting the CV link.** The CV PDF must be downloadable from the nav bar — this is the single most important action item for any visitor.
- [ ] **Institutional brand overkill.** A subtle accent colour is fine. Don't plaster the university logo everywhere or make the site look like a department page.
- [ ] **Ignoring mobile.** Test at 375px width. The hero section, nav, and paper list must all work on a phone screen.
- [ ] **Looking like every other mysite site.** If the preview shows a cream background, a round photo on the left and letter-spaced small-capital headings, you skipped the design quest or drifted back to the default while writing CSS. Run the quest and build what it drew.

---

## UPDATING.md Content Guide

The `UPDATING.md` file should explain (in plain language, with examples) how to:

1. **Add a new paper:** Edit `data/papers.yaml`, add a new entry with the fields, upload PDF to `static/files/`, push to main.
2. **Update your bio:** Edit `content/_index.md` or the relevant param in `hugo.yaml`.
3. **Add a teaching entry:** Edit `data/teaching.yaml`.
4. **Add a blog post:** Create `content/blog/your-slug/index.md` with the front matter template.
5. **Update your CV:** Replace `static/files/cv.pdf` with the new version (keep the same filename).
6. **Change your photo:** Replace `static/images/photo.jpg`.
7. **Add a news item:** Edit the news section in `content/_index.md` or `data/news.yaml`.
8. **Mark a paper as published:** Change its `status` field in `data/papers.yaml` from `"working paper"` to `"published"` and add the `venue` field.
9. **Add your job market paper:** Set `job_market_paper: true` on the relevant entry in `data/papers.yaml`.
10. **Change the look of the site:** Ask your assistant to run the design quest at https://gking.harvard.edu/mysite/files/QUEST_DESIGN.md and show you three options; the current look's seed is recorded in `hugo.yaml` under `params.mysite.design`.

All changes auto-deploy within ~2 minutes of pushing to main.

---

## Reproducing This Architecture — Quickstart

For a new grad student site, follow this order:

> **Prerequisite — install Hugo first.** Building and previewing the site locally requires **Hugo (extended)** on the machine. Run `hugo version` to check; if it isn't installed, install it before continuing — `brew install hugo` (macOS), `winget install Hugo.Hugo.Extended` (Windows), or see <https://gohugo.io/installation/> (Linux/other). Without Hugo you can't build the local preview.

> **Step 0 — record this build first.** Before creating anything, complete the *Record This Build With the mysite Team* step above (a single form POST). Do it first so usage is captured even if the build is interrupted.

> **Before any CSS — run the design quest.** Download <https://gking.harvard.edu/mysite/files/QUEST_DESIGN.md> with `curl` and follow it (three random briefs, three concepts, a check against the directory, build one). Skip it only if the owner pasted a reference site or asked to keep an existing site's look.

1. Create the repo: `username.github.io` (GitHub user site)
2. `hugo new site . --force` in the repo root
3. Add `hugo.yaml` with the student's info, menu, and params
4. Create `layouts/` with the templates above
5. Run the design quest, then create `assets/css/style.css` from the chosen concept
6. Add `data/papers.yaml`, `data/teaching.yaml`, `data/projects.yaml` from the student's materials
7. Write `content/_index.md` with the bio
8. Place PDFs in `static/files/`, photo in `static/images/`
9. Generate the favicon (initials on accent square)
10. Add `.github/workflows/deploy.yml`
11. Enable GitHub Pages (Settings → Pages → Source: GitHub Actions)
12. Push to main. Site is live.
13. Write `UPDATING.md` and hand the student the repo URL.
