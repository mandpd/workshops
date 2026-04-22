---
name: slide-authoring
description: Authoring individual HTML slides for the presentations repo. Use this skill whenever the user asks to create, edit, or review slides — including single slides, multi-slide sequences, or entire decks. Applies to any file under `decks/*/source/` or `decks/*/dist/` and to the shared design system under `shared/`.
---

# Slide Authoring

This repo is a collection of interactive HTML slide decks built on a shared design system. Each deck separates hand-authored source from generated output. A `flatten.js` script bakes partial markers into slides, copies shared assets, and generates index pages.

## Repo Layout

```
presentations/
  flatten.js                 ← build script
  index.html                 ← generated hub
  shared/                    ← source of truth for the design system
    shared.css
    shared.js
  decks/
    <deck-name>/
      source/                ← hand-authored input
        deck.json            ← slide order + nav labels
        01-*.html            ← slides with partial markers
      dist/                  ← generated output (do not hand-edit)
        01-*.html            ← flattened slides
        shared.css           ← copied from /shared
        shared.js            ← copied from /shared
        index.html           ← generated deck landing page
```

**The split matters.** `source/` is what you edit. `dist/` is derived and gets overwritten on every `flatten.js` run. Never hand-edit files in `dist/` — changes will be lost.

## Before You Start

Read these files in order — they are the source of truth and override anything else:

1. `shared/shared.css` — the full component vocabulary, color variables, typography scale, and layout primitives.
2. `shared/shared.js` — the navigation and animation helpers available at runtime, especially `initKeyNav`, `initScrollFade`, `typewriter`, and `staggerAppear`.
3. `flatten.js` — how partials get expanded. Don't write boilerplate that `flatten.js` will inject; use the markers.
4. An existing slide in `decks/<a-deck>/source/` if any exist — the reference for correct slide shape.
5. The deck's own `source/deck.json` — tells you the slide order, nav labels, and (by inference) which slide is prev/next of the one being edited.

If you haven't read those for the current session, read them before generating any slide.

## Slide Structure

Every slide is a lean HTML file using **four partial markers**. Do not hand-write the head, top nav, script tags, or `initKeyNav` call — `flatten.js` generates all of them from `deck.json`.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<!-- partial:head -->
    <style>
        /* Per-slide styles — ONLY for this slide's unique layout needs */
    </style>
</head>
<body>

<!-- partial:topnav -->

<div class="page">
    <main class="main">

        <section class="section" id="main">
            <!-- slide content -->
        </section>

    </main>
</div>

<!-- partial:scripts -->
<!-- partial:keynav -->

<script>
    /* Per-slide JavaScript (optional) — authored directly, not via a partial.
       Use this for slide-specific interactivity like click-to-pin highlighting,
       interactive demos, etc. Shared behavior (nav, fades) lives in shared.js. */
</script>
</body>
</html>
```

What the markers become after `node flatten.js`:

| Marker | Replaced with |
| --- | --- |
| `<!-- partial:head -->` | charset, viewport, Barlow + JetBrains Mono fonts, `<link rel="stylesheet" href="shared.css">`, and `<title>` derived from the slide's `nav` label + deck title |
| `<!-- partial:topnav -->` | full `<nav class="topnav">` with one link per slide in `deck.json` |
| `<!-- partial:scripts -->` | `<script src="shared.js"></script>` |
| `<!-- partial:keynav -->` | `<script>initKeyNav(prev, next, {firstUrl, lastUrl, current, total, deckTitle})</script>` |

Per-slide `<script>` blocks placed after the partials are preserved verbatim — that's where slide-specific logic belongs.

## Authoring Rules

### Content location

All slide content goes inside `<div class="page"><main class="main">`. `.main` has a `max-width: 1600px` centered in the viewport; sections inherit that width. Most slides have exactly one `<section class="section">`. Multi-part slides can have several; each should have a unique `id` so the sidebar-notes and nav-active-state observers can track it.

### Use the design system, don't invent

`shared.css` has a deep component vocabulary. Before writing custom CSS, check whether a component already exists. The in-file `<style>` block should only contain things that are genuinely unique to this one slide — layout tweaks, one-off positioning, per-slide helpers. If you find yourself writing the same custom CSS on multiple slides, it belongs in `shared.css` instead; flag that to the user rather than silently duplicating.

### Available components (non-exhaustive)

- **Typography:** `h1`, `h2`, `h3`, `.subtitle`, `.author`, `.section-label`, `.highlight`, `code`, `.mono`, color helpers (`.accent`, `.green`, `.red`, `.yellow`, `.orange`, `.purple`, `.cyan`, `.dim`)
- **Layout:** `.section`, `.section.centered`, `.grid-2` / `.grid-3` / `.grid-4` / `.grid-5`, `.demo-layout`, `.stagger-in`
- **Cards and chips:** `.card` + `.card-grid`, `.demo-card` + `.demo-grid`, `.pill` + `.pill-group`, `.processor-chip`, `.phase-card` (with `.input` / `.input-step` / `.output-stream` / `.output-step` / `.output-result` variants)
- **Code and terminal:** `.code-block` (with `.code-header`, `.code-filename`, `.code-lang`, `.code-body` and token classes `.kw`, `.fn`, `.str`, `.num`, `.cm`, `.op`, `.type`, `.prop`), `.code-highlight-block` with `.code-line.dim` / `.code-line.highlight`, `.tui-window`
- **Diagrams:** `.flow` + `.flow-node` + `.flow-arrow`, `.pipeline` + `.pipeline-node` + `.pipeline-arrow`, `.black-box` + `.floating-label`
- **Data:** `.bar-chart` + `.bar-row` + `.bar-track` + `.bar-fill`, `.stat-card` + `.stat-grid`, `.cache-indicator`
- **Callouts:** `.inline-note` (with `.accent` / `.green` / `.yellow` / `.orange`), `.callout` + `.callout-label`, `.roadmap-list` + `.roadmap-item`
- **Interactive demos:** `.context-window` with `.cw-block` variants (`.system` / `.observations` / `.messages` / `.retrieved`), `.chat-messages` + `.chat-msg` (with `.user` / `.assistant` / `.tool` roles), `.msg-bubble` (with `.user` / `.assistant` / `.tool` / `.observation` / `.compressed`), `.pseudo-chat` with `.chat-input` / `.chat-send`, `.processing-indicator`, `.mode-toggle`, `.buffer-progress`
- **Sidebar pattern:** `.sidebar` + `.sidebar-section` + `.sidebar-label` + `.sidebar-note[data-for]` (notes become visible when the section they target is scrolled into view)

### Design language

- **Accent color is amber** (`--accent: #f59e0b`). Use it sparingly for emphasis, active states, and one focal point per slide. Secondary colors (`--green`, `--red`, `--yellow`, `--orange`, `--purple`, `--cyan`, `--indigo`) exist for variation in diagrams, charts, and multi-category content.
- **Typography is Barlow** at 400 body weight, 500 headings. Don't override font weights up to 700+ unless the slide genuinely calls for heavy emphasis.
- **Background is near-black** (`--bg-primary: #06070d`). Cards and chips use `--bg-card` and `--bg-chip` for subtle depth. Avoid pure white or saturated fills.
- **Corners are moderately rounded** (10px for cards, 999px for pills and chips). Keep it consistent.
- **Animation is subtle.** Use `.fade-on-scroll`, `.stagger-in`, `.floatLabel`, or bar-fill width transitions. Don't add bouncy or flashy animations.

### Footer and navigation

Do not add prev/next buttons or anchor links in slide content — `initKeyNav` builds a fixed footer automatically. Keyboard shortcuts (`←` / `→` / `Home` / `End`) are also wired by `initKeyNav`. The footer takes height `--footer-height` (56px); the `.page` wrapper already reserves that space.

### Presenter-oriented interactivity: prefer click-to-pin over hover

When a slide has interactive highlighting, reveals, or state changes, **prefer click-to-pin over hover** unless the user specifically asks for hover. Rationale:
- Hover couples the state to cursor position, which fights the presenter's need to point at other things on the slide, gesture, or walk away from the keyboard.
- Click-to-pin sets state that persists until the user explicitly clears it.
- Standard clears: clicking the same trigger again, clicking outside the interactive region, pressing `Esc`.

The X-ray slide in `coding-with-agents` is the canonical example of this pattern; reuse its data-attribute approach (`data-highlights="X"` on triggers, `data-hl-target data-hl-key="X"` on the elements that should light up, plus `.is-highlighting` on the stage and `.is-related` on matched elements) when building similar interactions.

### Don't break backwards compatibility

`initKeyNav(prevUrl, nextUrl)` with just two arguments still works — it's the older slide pattern. Newly generated slides use the partial marker `<!-- partial:keynav -->`, which `flatten.js` expands to the full three-argument form with deck metadata. Never hand-write the three-argument form in slide files; let `flatten.js` do it.

## Workflow

When the user asks for a new slide or deck, follow this two-phase pattern:

### Phase 1 — Preview (self-contained)

While a slide is still being reviewed and iterated on, generate it as a **self-contained HTML file** that the user can open directly in a browser (served via a local server like `python -m http.server 8080`) alongside `shared.css` and `shared.js`. This means:

- Include a full `<head>` with charset, viewport, the Barlow + JetBrains Mono font link, and `<link rel="stylesheet" href="shared.css">`.
- Include the full `<nav class="topnav">` with brand and section links (a placeholder nav is fine if other slides don't exist yet).
- Include `<script src="shared.js"></script>` before the `initKeyNav` call.
- Call `initKeyNav(prev, next, options)` directly, passing `null` for unknown prev/next and reasonable placeholder values for `current`, `total`, `deckTitle`.
- Include any per-slide `<script>` block for slide-specific interactivity after `initKeyNav`.

This lets the user see the slide rendered correctly without running `flatten.js`. **Never hand the user a slide with unexpanded partial markers expecting them to just open it** — browsers don't expand the markers, and the page will render as unstyled HTML.

### Phase 2 — Bake (partial-marker version for `source/`)

Once the user is happy with a slide's content and layout, produce the **partial-marker version** — the same slide with the four markers in place of the head, topnav, scripts, and keynav call. This is what goes into `decks/<deck-name>/source/<slide>.html` and gets processed by `flatten.js` into `decks/<deck-name>/dist/<slide>.html`.

Only switch to this version after the user has approved the preview. The two versions should have identical `<body>` content inside `<div class="page"><main class="main">` and identical per-slide `<script>` blocks.

### Per-session guidance

1. **Check the deck's state.** Read `decks/<deck-name>/source/deck.json` if it exists. If the deck is new, propose a `deck.json` first and get the slide list agreed before writing slide content.
2. **One slide per artifact.** Name it matching the file (e.g. `02-content.html`). Keep content focused — one idea per slide, one focal component, supporting text.
3. **Don't generate the partial-marker version prematurely.** Stay in Phase 1 (self-contained) until the user signals the slide is done.
4. **Tell the user to re-run `flatten.js`** after adding or reordering slides or editing `deck.json`. One reminder at the end of a slide-generation session is enough.
5. **When editing an existing slide,** preserve the partial markers if they're present in `source/`. Edits should always target `source/`, never `dist/`.
6. **When the user asks a clarifying question, pause and wait for the answer.** Don't self-answer a question by picking an option and proceeding — a question costs one exchange and lets the user steer; self-answering wastes an iteration.

## Common Mistakes to Avoid

- **Writing full HTML boilerplate** (head tag, topnav, script tags) in `source/` slides instead of using partials. The markers exist precisely so slides stay small and consistent.
- **Hand-editing files in `dist/`.** These are generated. Edit `source/` and re-flatten.
- **Inventing custom CSS** when a component already exists in `shared.css`. Always check first.
- **Using the old indigo accent (#6366f1)** in per-slide styles. The accent is amber; use `var(--accent)`, never hardcoded hex.
- **Using Inter font links.** The shared system uses Barlow + JetBrains Mono; the head partial already loads them.
- **Overdoing color.** Each slide should have one dominant focal color (usually amber, sometimes a secondary for thematic reasons). Rainbow slides feel cluttered.
- **Adding prev/next links in slide content.** The footer handles this. Don't duplicate it.
- **Using hover for presenter-facing interactivity.** Hover breaks the moment the presenter moves the cursor. Click-to-pin is the default.
- **Generating multiple slides in one artifact.** One slide per artifact; it's cleaner to copy into place and easier to iterate on individually.
- **Forgetting `id` attributes on sections** when a slide has multiple sections. The sidebar-notes observer and nav-active-state observer both need them.

## When In Doubt

- Read the latest `shared.css` before assuming a component exists.
- If a request needs a new component that would be useful in multiple places, propose adding it to `shared.css` rather than inlining it.
- Ask the user for clarification on tone, audience, and slide goal before generating content if the brief is vague. Slide decks are dense and opinionated; getting direction up front beats rewriting after.
- When asking a clarifying question, stop and wait. Don't proceed with an assumed answer — it wastes the user's iteration budget when your assumption is wrong.