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
        "photo on the left, text on the right",
        "text on the left, photo on the right",
        "full-width banner with the photo set into it",
        "text-first hero with a small photo in the sidebar or header",
        "large square photo above a two-column introduction",
        "name as a very large wordmark, with a small photo beside the title",
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
with a left sidebar, the sidebar holds the photo and the navigation, and the hero is the text
block; with full-bleed bands, the hero is the first band. If the build instructions fix a
structure — the academic build keeps a top navigation bar — read "left sidebar" as "two
columns: content plus a narrow aside".

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
  drawn;
- the signature detail, placed somewhere specific;
- the institution's colour, used as a small accent, not as the main colour.

Take the draw seriously. If an option seems odd for this owner (a dark band for a department
that is all pastel), adapt it rather than quietly reverting to the usual cream-and-circle look.
Reverting is exactly the failure the quest is for.

## Step 3 — Check the three concepts against the directory

The point is that owners do not all end up with the same site, so check before you build:

1. Collect the addresses listed under "Featured sites" on <https://gking.harvard.edu/mysite/>:

   ```bash
   curl -sL https://gking.harvard.edu/mysite/ | grep -o 's-name[^>]*><a href=[^ >]*' | sed 's/.*href=//; s/"//g'
   ```

2. Download each one's home page with `curl -sL`, and the stylesheet it links to (the HTML is
   often minified, so attribute values may be unquoted; look for `background`, `font-family`
   and `border-radius` in the CSS, and for the order of the photo and the text in the first
   section). Note four things per site: background colour (warm, cool, white, dark), typeface
   family (serif or sans), hero arrangement, photo treatment.
3. A concept that matches an existing site on **three or more** of those four things is too
   close. Drop it and use the next concept; if all three are too close, draw again.

As of October 2026 the listed sites cluster on warm paper, a circular photo, and photo-left:
a concept with all three of those is too close whatever the fetch says. If the fetch fails (no
network, page changed), say so and carry on with the first concept that clears that floor.

## Step 4 — Build one, show three

Build the first concept that passed the check. In the first local preview, tell the owner, in
plain words, which concept was built and the other two in two sentences each, and that any of
them can be switched to, mixed, or changed. The owner may also say "run the quest again".

Record what was chosen so it can be reproduced and so a later rebuild does not silently change
the look. In `hugo.yaml`:

```yaml
params:
  mysite:
    design:
      seed: 20261006          # the number the script printed
      priming: "HARBOR and LEDGER"
      concept: "warm paper; serif headings, sans body; text-first hero; arched photo; numbered sections; one narrow column; hairline accents; sidenotes"
```

and add one line to `UPDATING.md`: "To change the look of the site, ask your assistant to run
the design quest at https://gking.harvard.edu/mysite/files/QUEST_DESIGN.md and show you three
options."

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
- Tone and content rules in the build instructions (understated, no filler, owner's own words).

## Using /quest for anything else

The same trick works for any open question with many good answers: paper topics, survey
items, names, counter-arguments. Draw five nouns with the script (edit the last lines to print
five), then answer the question five times, each answer starting with its own
`**Related to NOUN:**` and completing from there. Merge, de-duplicate, and show the owner the
set. That is the paper's method with the sentence-level part left out; the authors report that
the method works well with either part alone and best with both.
