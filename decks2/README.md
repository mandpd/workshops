# Presentations

Interactive HTML slide decks built with a shared design system. Dark-themed, Barlow typography, amber accent. Pure vanilla HTML/CSS/JS — **no build step required** to view; just open `index.html` in a browser.

## Quick Start

```bash
# Open the root hub
open index.html

# Or open a specific deck directly
open decks/<deck-name>/index.html
```

**Keyboard navigation:** ← → arrow keys move between slides. `Home` / `End` jump to the first / last slide.

## Creating a New Deck

### 1. Create the deck directory

```bash
mkdir decks/my-new-deck
```

### 2. Create `decks/my-new-deck/deck.json`

This drives the slide order, top-nav labels, and footer metadata.

```json
{
  "title": "My New Deck",
  "slides": [
    { "file": "01-intro.html", "nav": "Intro" },
    { "file": "02-content.html", "nav": "Content" },
    { "file": "03-summary.html", "nav": "Summary" }
  ]
}
```

- `file` — the HTML filename (in the same directory)
- `nav` — the label shown in the top nav bar

### 3. Create each slide from the starter template

Each slide is a lean HTML file that uses **partial markers** — placeholders that `flatten.js` fills in with the correct head, top nav, scripts, and navigation wiring for this deck.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<!-- partial:head -->
    <style>
        /* ===== Per-slide styles (only what's unique to this slide) ===== */
    </style>
</head>
<body>

<!-- partial:topnav -->

<div class="page">
    <main class="main">

        <section class="section" id="main">
            <div class="section-label">SECTION LABEL</div>
            <h2>Slide heading goes here</h2>
            <p>Opening paragraph or lede.</p>
        </section>

    </main>
</div>

<!-- partial:scripts -->
<!-- partial:keynav -->
</body>
</html>
```

The four partial markers get replaced automatically:

| Marker | What it becomes |
| --- | --- |
| `<!-- partial:head -->` | charset, viewport, fonts, `shared.css` link, and the page title derived from the slide's `nav` label + deck title |
| `<!-- partial:topnav -->` | full top nav with one link per slide in `deck.json` |
| `<!-- partial:scripts -->` | `<script src="shared.js"></script>` |
| `<!-- partial:keynav -->` | `initKeyNav(...)` call wired with prev/next/first/last URLs, slide counter, and deck title |

### 4. Run the flattener

```bash
node flatten.js
```

This:

- Replaces the partial markers in every slide in-place
- Copies `shared/shared.css` and `shared/shared.js` into each deck directory
- Generates a `decks/<deck-name>/index.html` landing page for the deck
- Regenerates the root `index.html` hub linking all decks

Re-run `flatten.js` whenever you add or reorder slides, edit `deck.json`, or change the shared assets.

## Project Structure

```
├── index.html            # Root hub page linking all decks (generated)
├── flatten.js            # Regenerates index pages & copies shared assets
├── shared/               # Source of truth for the shared design system
│   ├── shared.css        # Variables, components, utilities
│   └── shared.js         # Navigation, animations, helpers
└── decks/                # Each subdirectory is a self-contained deck
    └── my-new-deck/
        ├── deck.json     # Deck manifest (title + slide order)
        ├── 01-intro.html # Slide files
        ├── 02-content.html
        ├── 03-summary.html
        ├── index.html    # Deck landing page (generated)
        ├── shared.css    # Copied in by flatten.js
        └── shared.js     # Copied in by flatten.js
```

## Design System

The shared system provides components and utilities including typography (`h1`–`h3`, `.subtitle`, `.section-label`), layout (`.section`, `.grid-2`/`.grid-3`/`.grid-4`/`.grid-5`, `.demo-layout`), cards and chips (`.card`, `.card-grid`, `.pill`, `.pill-group`, `.processor-chip`), code and terminal UI (`.code-block`, `.tui-window`, `.code-highlight-block`), diagrams (`.flow`, `.pipeline`, `.phase-card`), data visualization (`.bar-chart`, `.stat-card`, `.stat-grid`), callouts (`.inline-note`, `.callout`), and interactive demos (`.context-window`, `.chat-messages`, `.msg-bubble`).

The active accent is amber (`--accent: #f59e0b`); secondary colors (`--green`, `--red`, `--yellow`, `--orange`, `--purple`, `--cyan`, `--indigo`) are available as both solid and `-dim` backgrounds for variation. Typography uses Barlow (300–700 weights) with JetBrains Mono for code.

## Footer Navigation

Every slide gets a fixed footer with prev / next / first / last buttons, a slide counter, and the deck title. Footer controls and keyboard shortcuts are wired automatically by `initKeyNav` when `flatten.js` bakes in the `<!-- partial:keynav -->` call.