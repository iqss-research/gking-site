---
name: quest
description: Design quest for a GaryKing.org/mysite website — draw a random design brief so each site gets its own look, following the recoding-decoding idea in Luo, King, Puett and Smith (2026), "Inducing Sustained Creativity and Diversity in Large Language Models" (https://garyking.org/quest). Use before writing any CSS for a new site, or when the owner asks for a fresh look.
---

# /quest — a design brief that is different every time

## Why this exists

Ask a language model for "a clean academic website" a hundred times and you get the same
website a hundred times: the same cream background, the same round photo on the left, the same
spaced-out small capitals. The paper at <https://garyking.org/quest> shows why (models return
their most common answer to open questions) and shows a cheap fix: put a **random priming
phrase** such as `**Related to HARBOR:**` in front of the question. The phrase pulls the model
off its usual path and onto one that is still relevant but different. Done once per site, this
gives every owner a look of their own instead of a copy of the last person's.

This file is that fix, applied to the design of one website. Follow it **before writing any
CSS**, after you have the owner's content and before the first local preview.

**When not to run it:** if the owner pasted a link to a website whose design they like, that
site is the visual model and this quest is skipped. If the owner is migrating an existing site
and asked to keep its look, keep its look.

## Step 1 — Draw the seeds with real randomness (do not improvise them)

Language models are bad at picking at random; they drift back to their favorites. So the draw
is made by a short program, not by you, and the program must be copied exactly, never retyped.
**Download this file rather than reading it through a page-fetch tool**, which may summarise it
and lose the word list, then cut the script out of it:

```bash
curl -sL https://gking.harvard.edu/mysite/files/QUEST_DESIGN.md -o QUEST_DESIGN.md
awk '/^```python/{f=1;next}/^```/{f=0}f' QUEST_DESIGN.md > _quest.py
python3 _quest.py            # a fresh draw
python3 _quest.py 20261006   # the same draw again, for a seed you want to reproduce
```

(On Windows the command is `python` rather than `python3`, and the `awk` line can be replaced by
copying the script out of the file by hand, byte for byte.) Both files sit in the repository root
and are not part of the site: delete them once the seed is recorded, since the seed reproduces
the draw.

If Python is not available, draw with the shell: `echo $((RANDOM % 500))` picks a noun by its
position in the list (counting from zero; the list has 500 different nouns), and
`echo $((RANDOM % 5))` picks among five options — one such draw for every line. In PowerShell
the equivalent is `Get-Random -Maximum 500`. Never type the words from memory.

```python
#!/usr/bin/env python3
"""Design quest: draw a random brief. Usage: python3 _quest.py [seed]"""
import random, sys, time

NOUNS = """granite basalt marble limestone sandstone quartz flint obsidian jade copper bronze brass pewter
silver gold chalk clay terracotta porcelain crystal enamel bamboo cedar oak pine birch walnut
elm teak mahogany ebony linen velvet leather canvas burlap tweed parchment plaster mortar
concrete timber lumber pearl shell driftwood sawdust charcoal graphite ink dye indigo ochre
umber sienna saffron ultramarine verdigris sepia lapis cinnabar madder sextant astrolabe
telescope microscope barometer sundial hourglass metronome abacus protractor caliper lathe loom
spindle shuttle needle thimble awl anvil bellows forge kiln furnace pestle sieve funnel ladle
kettle cauldron griddle vise mallet pulley winch flywheel piston turbine dynamo magnet lens
mirror lantern lamp candle torch beacon typewriter telegraph gramophone camera projector
pendulum chime gong whistle harbor wharf jetty boathouse mill windmill watermill granary silo
stable orchard vineyard greenhouse conservatory garden courtyard cloister chapel abbey belfry
spire dome cupola arch vault cellar loft pantry larder hearth chimney porch balcony terrace
atrium gallery museum library scriptorium observatory planetarium laboratory workshop atelier
foundry bakery brewery apiary aviary aqueduct canal reservoir cistern fountain river brook
stream estuary delta marsh fen heath meadow prairie steppe savanna tundra grove thicket hedgerow
canyon gorge glen crag bluff mesa butte plateau cove bay lagoon reef atoll archipelago cape
headland fjord glacier iceberg volcano oasis quarry cavern grotto monsoon zephyr gale squall
drizzle mist haze frost snow sleet hail thunder lightning aurora twilight dusk dawn sunrise
sunset moon moonlight starlight constellation comet meteor galaxy planet orbit eclipse equinox
solstice zenith meridian latitude longitude tide swell willow poplar cypress juniper larch fir
hazel hawthorn rowan yew olive almond chestnut acorn ivy moss lichen bracken heather gorse
thistle clover lavender thyme sage mint basil cardamom cinnamon clove ginger vanilla cocoa honey
nectar pollen lotus lily iris orchid peony poppy marigold dahlia magnolia jasmine kelp seaweed
reed rush sedge heron kingfisher falcon kestrel wren sparrow swallow raven magpie hare badger
otter beaver elk bison mule ox lamb turtle salmon trout carp dolphin walrus dragonfly firefly
cricket teapot pitcher flask barrel cask keg basket hamper wardrobe quilt blanket hammock cradle
lectern easel brush quill nib inkwell blotter journal diary notebook sketchbook almanac atlas
globe horn bugle trumpet flute oboe bassoon cello viola violin fiddle harp lyre mandolin banjo
guitar piano organ drum tambourine cymbal xylophone envelope ribbon twine knot rafter joist
lintel cornerstone flagstone cobblestone gravel pebble boulder milestone signpost alley avenue
boulevard promenade causeway footbridge stile hedge trellis pergola gazebo pavilion bandstand
carousel kite balloon mast rudder keel hull anchor oar paddle canoe kayak skiff dinghy barge
ferry tugboat trawler lifeboat raft sleigh wagon cart carriage coach tram bicycle saddle stirrup
bridle harness yoke scythe sickle rake hoe spade trowel wheelbarrow pitchfork haystack hayloft
scarecrow pasture paddock croft farmstead homestead cottage chalet lodge inn tavern teahouse
bistro market bazaar arcade plaza piazza forum theater opera circus carnival festival parade
baguette croissant pretzel biscuit scone tart pastry pudding custard marmalade chutney molasses
barley millet plum cherry apricot quince pomegranate tangerine mango papaya pineapple raisin
hazelnut pistachio pecan truffle pumpkin artichoke asparagus""".split()

AXES = {
    "overall temperature": [
        "warm paper (cream or ivory surfaces)",
        "cool stone (grey-white surfaces with a cool tint)",
        "plain white with strong black type",
        "deep ink header or band, light body",
        "a very pale tint of one colour as the page background (grey-green, grey-blue)",
    ],
    "typeface": [
        "humanist sans-serif (system stack)",
        "grotesque sans-serif, tight and bold for headings",
        "old-style serif for everything",
        "serif headings, sans body",
        "sans headings, serif body",
        "slab serif headings with a sans body",
        "monospace labels and metadata, sans body",
    ],
    "hero (the first screen)": [
        "1 photo on the left, text on the right",
        "2 text on the left, photo on the right",
        "3 centered: photo above, name and intro centered below",
        "4 narrow left column with photo, name, title and links; intro to the right",
        "5 full-width banner (a colour band or a photo of the owner's workplace) with the name on it, intro below",
        "6 text-first: name, one line, straight into the work; small photo in the header or none above the fold",
        "7 name as a very large wordmark across the top, small photo beside the title",
        "8 featured figure: one figure from the owner's best-known paper, large, beside the name (still)",
        "9 publication timeline: a line under the name with a mark per paper by year, each a link (still)",
        "10 map of the work: a small map of the places the owner's research is about, dots that pulse once on load (moving once)",
        "11 coauthor constellation: the owner's coauthors as a small network drifting very slowly beside the intro (moving)",
        "12 a chart that draws itself: one key result from the owner's work, redrawn as a plain chart that draws on once (moving once)",
        "13 topic field: the owner's research areas and recurring title words as a typographic band behind or beside the name, sized by frequency (still)",
        "14 slow slideshow: three to five figures from the owner's papers crossfading beside the intro, each captioned (moving)",
        "15 work grid: tiles of figures or covers from the owner's papers with their titles, under the name and one line (still)",
    ],
    "photo treatment": [
        "circle",
        "square, hard corners",
        "rounded rectangle",
        "arched top (a window shape)",
        "natural aspect, no crop, thin border",
        "black-and-white",
    ],
    "section headings": [
        "small capitals, letter-spaced",
        "large and heavy, no decoration",
        "italic serif",
        "numbered (01, 02, 03) in the accent colour",
        "a short rule above or below",
        "a label on a filled block",
    ],
    "page structure": [
        "one narrow column (about 700px)",
        "one wide column (about 1000px)",
        "left sidebar with the navigation and photo, content to the right",
        "two columns: content plus a narrow aside for dates and links",
        "full-bleed bands, each section on its own background",
    ],
    "how the accent colour is used": [
        "hairlines and underlines only",
        "filled buttons and badges",
        "large initial letters and section numbers",
        "one background band (header or footer)",
        "nearly monochrome page, one accent used once per screen",
    ],
    "one signature detail": [
        "a thin timeline for the CV or news",
        "sidenotes in the margin for comments",
        "drop caps on the bio",
        "a place-name line (city, building) under the affiliation",
        "generous pull-quote of the research tagline",
        "a dated 'latest' strip at the top of the page",
        "iconless, text-only link labels in brackets like [PDF]",
    ],
}

seed = int(sys.argv[1]) if len(sys.argv) > 1 else int(time.time())
rng = random.Random(seed)
nouns = rng.sample(sorted(set(NOUNS)), 2)
print(f"seed: {seed}")
print(f"priming phrase: **Related to {nouns[0].upper()} and {nouns[1].upper()}:**")
for axis, options in AXES.items():
    print(f"{axis}: {rng.choice(options)}")
```

Run it **three times** (three different seeds) so you have three draws. Keep the printed text.

**When two lines of a draw do not fit together**, the page structure wins and the hero adapts:
with a left sidebar, the sidebar holds the photo and the navigation, the hero is the text block,
and first screen 4 (itself a narrow column) merges into that sidebar; with full-bleed bands, the
hero is the first band; a "deep ink header" temperature and the banner of first screen 5 are one
band, not two; the work grid of first screen 15 in a narrow column is two tiles across. If the
build instructions fix a structure — the academic build keeps a top navigation bar — read "left
sidebar" as "two columns: content plus a narrow aside".

## Step 2 — Turn each draw into a concept (the priming phrase goes first)

For each draw, write one short concept, **starting with its priming phrase exactly as printed**
and continuing as if completing the sentence. The phrase is not decoration: write the concept
as what a site "related to HARBOR and LEDGER" would look like, and let that pull the colours,
shapes and details away from the usual. Each concept must contain:

- a palette of five or six colours with hex codes (background, surface, text, muted text,
  accent, link), checked for contrast (4.5:1 for body text, 3:1 for large text);
- the typeface choice from the draw, named as an actual font stack: system fonts, or an
  open-licence font file (SIL Open Font License, as most Google Fonts are) that you
  **self-host** in `static/fonts/`, two weights at most; never a font loaded from another
  company's server. If you cannot download a font, use the nearest system family instead: for a
  serif, `"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif`; for a slab,
  `Rockwell, "Roboto Slab", Georgia, serif`; for a grotesque, `"Helvetica Neue", Helvetica, Arial,
  sans-serif`; for monospace labels, `"SF Mono", Menlo, Consolas, monospace`;
- the hero arrangement, photo treatment, heading style, page structure and accent use, each as
  drawn; for a first screen with a graphic (arrangements 8–15), what it is made from (which
  paper, figure, places, coauthors or words) and what the still version looks like;
- the signature detail, placed somewhere specific;
- the institution's colour, used as a small accent, not as the main colour.

Take the draw seriously. If an option seems odd for this owner (a dark band for a department
that is all pastel), adapt it rather than quietly reverting to the usual cream-and-circle look.
Reverting is exactly the failure the quest is for.

### The first screen: fifteen arrangements

The "hero" line of the draw picks one of fifteen first screens. The first seven are the ways
academic sites arrange a photo and text; the other eight put a still or moving graphic **made
from the owner's own work** on the first screen. They were collected in October 2026 from real
academic sites and the common site templates (Quarto's about pages, Hugo Blox, al-folio,
academicpages, and the personal sites of economists, political scientists, statisticians and
data-visualisation researchers).

| # | Arrangement | Seen on | Made from | If the owner's materials cannot support it |
|---|---|---|---|---|
| 1 | Photo left, text right | Hugo Blox landing pages; Quarto *broadside* | the photo | — |
| 2 | Text left, photo right | al-folio; Quarto *solana* | the photo | — |
| 3 | Centered: photo above, name and intro centered below | Quarto *jolla*; Hugo Academic | the photo | — |
| 4 | Narrow left column (photo, name, title, links), intro to the right | Quarto *trestles*; academicpages; many political-science sites | the photo | — |
| 5 | Full-width banner with the name on it, intro below | Quarto *marquee*; sites with a dark header band | a colour band, or a photo of the owner's building, lab or city | — |
| 6 | Text-first: name, one line, straight into the work; small photo in the header or none above the fold | sociologists' and computer scientists' minimal sites | the papers list | — |
| 7 | Name as a very large wordmark across the top, small photo beside the title | economists' and sociologists' sites with a type-led header | the name | — |
| 8 | **Featured figure**: one figure from the owner's best-known paper, large, beside the name (still) | sites that lead with a book cover or a key figure | the figure as an image from the author's own version of the paper (or an image file the owner supplies), or the owner's book cover, or the paper's title page set as a card; captioned with the paper's title | use 1 |
| 9 | **Publication timeline**: a line under the name with a mark per paper by year, each a link (still) | timeline-style home pages | the papers list (years, titles); with more than twelve papers, one mark per year sized by count, not one per paper | fewer than three papers: use 6 |
| 10 | **Map of the work**: a small map of the places the owner's research is about, dots that pulse once on load (moving once) | field researchers' sites | places named in the papers (countries, regions, cities) on an accurate outline rendered once to SVG from public-domain Natural Earth data (with Node: the `world-atlas` or `us-atlas` package plus `d3-geo`, run once at build time, the packages then removed), under 100 KB; never an outline drawn by hand | no places in the work, or no way to render an accurate outline: use 5 |
| 11 | **Coauthor constellation**: the coauthors as a small network drifting very slowly beside the intro (moving) | data-visualisation researchers' sites with a particle or network header | the author lists of the papers; names as faint labels | fewer than four coauthors: use 3 |
| 12 | **A chart that draws itself**: one key result from the owner's work, redrawn as a plain chart that draws on once (moving once) | sites of researchers who lead with a result | numbers copied exactly from a table or the text of the owner's own paper, drawn in the site's palette and confirmed by the owner in the preview; never numbers estimated from a picture of a chart, never someone else's data | no such numbers: use 2 |
| 13 | **Topic field**: the research areas and recurring title words as a typographic band behind or beside the name, sized by frequency (still) | type-led sites | the research interests and the words of the paper titles, set in one typeface, three sizes at most, one muted colour — a typeset list, not a rainbow tag cloud | fewer than five distinct words: use 7 |
| 14 | **Slow slideshow**: three to five figures from the owner's papers crossfading beside the intro, each captioned (moving) | lab sites with a research-image carousel | the author's own figures, covers or title cards, fitted inside one fixed frame so nothing jumps between slides | fewer than three images: use 4 |
| 15 | **Work grid**: tiles of figures or covers from the papers with their titles, under the name and one line (still) | generative artists' and visualisation researchers' sites that open with a grid of work | the author's own figures or covers | fewer than four images: use 6 |

### Graphics made from the owner's work (arrangements 8–15)

- **Only the owner's own materials.** Figures from their papers in the author's version (a
  figure that exists only in the journal's typeset version is the publisher's layout: pick
  another figure, the book cover, or a title card), data they report, the places, coauthors,
  years and words of their own paper list. No stock images, no one else's figure, no decoration
  that pretends to be data.
- **Take figures out as images; do not redraw them by eye.** Use `pdftoppm` or `pdfimages`
  (poppler) when installed, otherwise ask the owner for the figure file. A redrawn chart is
  allowed only when every number in it is copied from a table or the text of the paper, and the
  owner confirms it in the preview. Never draw a map outline or a chart by estimation.
- **Keep images light.** Each image at most 1200 pixels wide and under 60 KB (JPEG or WebP),
  so the whole first screen stays within the site's page-weight rule.
- **Still by default.** Build the still version first. Motion is one gentle thing: a draw-on of
  at most two seconds that happens once, a drift of a few pixels a second, a crossfade every
  eight to ten seconds. Nothing loops fast, blinks, or plays video. When the visitor's system
  asks for reduced motion (`prefers-reduced-motion: reduce`), show the still version only.
- **Small and self-contained.** Inline SVG, CSS, and at most a few dozen lines of plain
  JavaScript; no libraries; no files from other servers; under 150 KB for the whole graphic.
  Give it `alt` text or an `aria-label` that says what it shows. The name and intro are still
  the first thing read, and on a phone the graphic shrinks or moves below the text.
- **Say what it was made from.** In the preview, tell the owner which paper, figure, places or
  coauthors the graphic comes from, and that it can be swapped or removed.
- **Fall back honestly.** If the owner's materials cannot support the arrangement drawn, use the
  fallback in the table and say so; do not invent a figure to fill the space.

## Step 3 — Check the three concepts, and replace any that fail, before the owner sees them

The point is that owners do not all end up with the same site, and that the three choices are
real choices. Check before building anything, and fix a failure by redrawing, so the owner
never sees a concept that failed:

1. Collect the addresses listed under "Featured sites" on <https://gking.harvard.edu/mysite/>:

   ```bash
   curl -sL https://gking.harvard.edu/mysite/ | grep -o 's-name[^>]*><a href=[^ >]*' | sed 's/.*href=//; s/"//g'
   ```

2. Download each one's home page with `curl -sL`, and the stylesheet it links to (the HTML is
   often minified, so attribute values may be unquoted; look for `background`, `font-family`
   and `border-radius` in the CSS, and for the order of the photo and the text in the first
   section). Note four things per site: background colour (warm, cool, white, dark), typeface
   family (serif or sans), hero arrangement, photo treatment.
3. **Too close to a listed site:** a concept that matches an existing site on **all four** of
   those things. **Too close to each other:** two of the three concepts that match each other
   on three or more of the four (the owner's three choices must look different). In either
   case, replace the failing concept: run the script again for a new seed, write a new concept
   from it as in Step 2, and check it the same way. Repeat until three concepts pass. If a
   replacement has failed six times in a row, keep the best of the attempts and tell the owner
   why.

As of October 2026 the listed sites cluster on warm paper, a circular photo, and photo-left:
a concept with all three of those is too close whatever the fetch says. If the fetch fails (no
network, page changed), say so, apply that floor, and carry on.

## Step 4 — Build three previews, let the owner choose, then build the site

Before building the full site, make a preview of the home page in each of the three concepts,
with the owner's real content: their name, title, photo, intro text and a few of their papers.
Keep the previews small and self-contained:

- a folder `_quest/` in the repository root holding `preview-1.html`, `preview-2.html` and
  `preview-3.html`, each a complete page with its CSS inline and the owner's photo (and any
  figure images) copied alongside, plus an `index.html` that is a plain list of three links,
  each with its priming phrase and a one-line description;
- each preview shows what the real site will show first: the header with the owner's name,
  the hero, the About text, a few papers, the footer;
- the folder is not part of the site: add `_quest/` to `.gitignore`, and delete it once the
  choice is made.

Then show them. Tell the owner to open `_quest/index.html` in their browser (or serve the folder
with `python3 -m http.server 8788 --directory _quest` and give them the link), and ask which of
the three to build. The owner may instead ask for a mix of two, a change to one, or a fresh set
of three (new seeds, same checks).

Build the full site in the chosen concept, and record the choice so it can be reproduced and so
a later rebuild does not silently change the look. In `hugo.yaml`:

```yaml
params:
  mysite:
    design:
      seed: 20261006          # the chosen draw's seed, as the script printed it
      priming: "HARBOR and LEDGER"
      concept: "warm paper; serif headings, sans body; text-first hero; arched photo; numbered sections; one narrow column; hairline accents; sidenotes"
      alternatives: [20261007, 20261011]   # the seeds of the two previews not chosen
```

and add one line to `UPDATING.md`: "To change the look of the site, ask your assistant to run
the design quest at https://gking.harvard.edu/mysite/files/QUEST_DESIGN.md and show you three
previews."

Optionally, save this file as `.claude/skills/quest/SKILL.md` in the repository so the owner
can type `/quest` later to redraw.

## What the draw never changes

These are not taste. They stay no matter what the dice say:

- The owner's full name is in the header on every page and links to the home page.
- The site works on a phone (375px wide): the hero stacks, the menu collapses, nothing overflows.
- Body text contrast of 4.5:1 or better; visible keyboard focus; skip-to-content link; `alt`
  text on every image; `prefers-reduced-motion` respected.
- Light mode only; no theme toggle.
- One `https://` address everywhere; stable URLs.
- The footer credit and the invisible marker, exactly as the information form's boxes say.
- Everything the site needs lives in the repository: no fonts, scripts or images loaded from
  other servers.
- A moving graphic is gentle, happens once or slowly, stops under `prefers-reduced-motion`,
  and is made from the owner's own work; never video, never a library, never decoration.
- Tone and content rules in the build instructions (understated, no filler, owner's own words).

## Using /quest for anything else

The same trick works for any open question with many good answers: paper topics, survey
items, names, counter-arguments. Draw five nouns with the script (edit the last lines to print
five), then answer the question five times, each answer starting with its own
`**Related to NOUN:**` and completing from there. Merge, de-duplicate, and show the owner the
set. That is the paper's method with the sentence-level part left out; the authors report that
the method works well with either part alone and best with both.
