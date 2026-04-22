#!/usr/bin/env node

/**
 * flatten.js — Bake all partial markers into the deck slides in-place.
 * After running this, every HTML file is self-contained and works
 * directly from the filesystem (file:// protocol).
 *
 * Usage: node flatten.js
 *
 * This replaces:
 *   <!-- partial:head -->     → meta, fonts, shared.css link
 *   <!-- partial:title -->    → slide nav label + deck title
 *   <!-- partial:topnav -->   → full navigation bar
 *   <!-- partial:scripts -->  → <script src="shared.js"></script>
 *   <!-- partial:keynav -->   → <script>initKeyNav(prev, next, {...});</script>
 *
 * It also:
 *   - Copies shared.css and shared.js into each deck directory
 *   - Generates a styled index.html for each deck
 *   - Generates a root index.html linking all decks
 */

const fs = require("fs");
const path = require("path");

const DECKS_DIR = path.join(__dirname, "decks");
const SHARED_DIR = path.join(__dirname, "shared");

// ─── Shared constants ───────────────────────────────────────────────────────

const FONTS_LINK = `<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">`;

// ─── Helpers ────────────────────────────────────────────────────────────────

function readFile(p) {
  return fs.readFileSync(p, "utf-8");
}

function writeFile(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, "utf-8");
}

// ─── Partial Content ────────────────────────────────────────────────────────

// Title placeholder is replaced per-slide in processSlide()
const HEAD_PARTIAL = `    <meta charset="UTF-8">
    <title><!-- partial:title --></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    ${FONTS_LINK}
    <link rel="stylesheet" href="shared.css">`;

const SCRIPTS_PARTIAL = `<script src="shared.js"></script>`;

function generateTopnav(deck) {
  const links = deck.slides
    .map((s) => `        <a href="${s.file}">${s.nav}</a>`)
    .join("\n");

  return `<nav class="topnav">
    <a href="${deck.slides[0].file}" class="topnav-brand">${deck.title}</a>
    <div class="topnav-sections">
${links}
    </div>
</nav>`;
}

/**
 * Build a full initKeyNav(...) call with deck-aware options:
 *   - prevUrl / nextUrl
 *   - firstUrl (first slide) / lastUrl (last slide)
 *   - current (1-based index) / total
 *   - deckTitle
 *
 * These power the fixed footer's slide counter, Home/End keys,
 * and left-side deck title label.
 */
function getKeyNavCall(deck, slideFile) {
  const idx = deck.slides.findIndex((s) => s.file === slideFile);
  const total = deck.slides.length;

  const prev = idx > 0 ? JSON.stringify(deck.slides[idx - 1].file) : "null";
  const next =
    idx < total - 1 ? JSON.stringify(deck.slides[idx + 1].file) : "null";

  const first = JSON.stringify(deck.slides[0].file);
  const last = JSON.stringify(deck.slides[total - 1].file);

  // Compact single-line form so it fits cleanly where the partial marker was.
  const options =
    `{ firstUrl: ${first}, lastUrl: ${last}, ` +
    `current: ${idx + 1}, total: ${total}, ` +
    `deckTitle: ${JSON.stringify(deck.title)} }`;

  return `initKeyNav(${prev}, ${next}, ${options});`;
}

// ─── Process a single slide ─────────────────────────────────────────────────

function processSlide(html, deck, slideFile) {
  // 1. Head partial (without title — title is separate)
  html = html.replace(/<!-- partial:head -->/g, HEAD_PARTIAL);

  // 2. Title
  const slide = deck.slides.find((s) => s.file === slideFile);
  const pageTitle = slide ? `${slide.nav} — ${deck.title}` : deck.title;
  html = html.replace(/<!-- partial:title -->/g, pageTitle);

  // 3. Topnav
  html = html.replace(/<!-- partial:topnav -->/g, generateTopnav(deck));

  // 4. Scripts (shared.js)
  html = html.replace(/<!-- partial:scripts -->/g, SCRIPTS_PARTIAL);

  // 5. Keynav
  html = html.replace(
    /<!-- partial:keynav -->/g,
    `<script>${getKeyNavCall(deck, slideFile)}</script>`
  );

  return html;
}

// ─── Generate deck index page ───────────────────────────────────────────────

function generateDeckIndex(deck) {
  const firstSlide = deck.slides[0].file;
  const slideLinks = deck.slides
    .map(
      (s, i) =>
        `            <a href="${s.file}" class="card"><span class="demo-number">${String(i + 1).padStart(2, "0")}</span><h4>${s.nav}</h4></a>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${deck.title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    ${FONTS_LINK}
    <link rel="stylesheet" href="shared.css">
    <style>
        body { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        .index-wrapper { text-align: center; max-width: 900px; padding: 2rem; }
        .index-wrapper h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
        .index-wrapper .subtitle { color: var(--text-secondary); font-size: 1.1rem; margin-bottom: 2.5rem; }
        .slide-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; text-align: left; }
        .slide-grid .card { text-decoration: none; cursor: pointer; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; }
        .slide-grid .card:hover { border-color: var(--accent); transform: translateY(-2px); }
        .slide-grid .card .demo-number { font-family: var(--font-mono); font-size: 0.85rem; color: var(--accent); }
        .slide-grid .card h4 { color: var(--text-primary); font-size: 0.95rem; margin: 0; font-weight: 500; }
        .start-link { display: inline-block; margin-bottom: 2rem; padding: 0.7rem 1.75rem; background: var(--accent); color: #1a1205; text-decoration: none; border-radius: 999px; font-weight: 500; transition: background 0.15s; letter-spacing: 0.01em; }
        .start-link:hover { background: var(--accent-hover); }
    </style>
</head>
<body>
    <div class="index-wrapper">
        <h1>${deck.title}</h1>
        <p class="subtitle">${deck.slides.length} slides</p>
        <a href="${firstSlide}" class="start-link">Start Presentation →</a>
        <div class="slide-grid">
${slideLinks}
        </div>
    </div>
</body>
</html>`;
}

// ─── Generate root index page ───────────────────────────────────────────────

function generateRootIndex(decks) {
  const deckLinks = decks
    .map(
      (d) =>
        `        <a href="decks/${d.name}/index.html" class="card"><h4>${d.deck.title}</h4><p>${d.deck.slides.length} slides</p></a>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Presentations</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    ${FONTS_LINK}
    <style>
        :root {
            --bg-primary: #06070d;
            --bg-card: #10131d;
            --bg-chip: #171a25;
            --text-primary: #ececf0;
            --text-secondary: #a8aab3;
            --text-dim: #636773;
            --accent: #f59e0b;
            --accent-hover: #fbbf24;
            --accent-dim: rgba(245, 158, 11, 0.18);
            --accent-border: rgba(245, 158, 11, 0.45);
            --border: rgba(255,255,255,0.06);
            --border-light: rgba(255,255,255,0.12);
            --font-sans: 'Barlow', system-ui, -apple-system, sans-serif;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: var(--font-sans);
            background: var(--bg-primary);
            color: var(--text-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            font-weight: 400;
            letter-spacing: 0.005em;
            -webkit-font-smoothing: antialiased;
        }
        .index-wrapper { text-align: center; max-width: 900px; padding: 2rem; }
        h1 { font-size: 2.5rem; font-weight: 500; margin-bottom: 0.5rem; letter-spacing: -0.015em; }
        .subtitle { color: var(--text-secondary); font-size: 1.1rem; margin-bottom: 2.5rem; font-weight: 300; }
        .deck-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 1.25rem;
            text-align: left;
        }
        .card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 1.5rem;
            text-decoration: none;
            transition: border-color 0.15s, transform 0.15s, background 0.15s;
        }
        .card:hover {
            border-color: var(--accent-border);
            background: var(--bg-chip);
            transform: translateY(-2px);
        }
        .card h4 { color: var(--text-primary); font-size: 1.05rem; font-weight: 500; margin-bottom: 0.5rem; }
        .card p { color: var(--text-secondary); font-size: 0.9rem; font-weight: 400; }
    </style>
</head>
<body>
    <div class="index-wrapper">
        <h1>Presentations</h1>
        <p class="subtitle">Presentation hub</p>
        <div class="deck-grid">
${deckLinks}
        </div>
    </div>
</body>
</html>`;
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  console.log("🔨 Flattening decks...\n");

  const deckDirs = fs
    .readdirSync(DECKS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const allDecks = [];

  for (const name of deckDirs) {
    const deckDir = path.join(DECKS_DIR, name);
    const deckJsonPath = path.join(deckDir, "deck.json");
    if (!fs.existsSync(deckJsonPath)) {
      console.warn(`  ⚠ Skipping ${name} — no deck.json`);
      continue;
    }

    const deck = JSON.parse(readFile(deckJsonPath));
    console.log(`  📦 ${name} (${deck.slides.length} slides)`);
    allDecks.push({ name, deck });

    // Process each slide in-place
    let flattened = 0;
    for (const slide of deck.slides) {
      const slidePath = path.join(deckDir, slide.file);
      if (!fs.existsSync(slidePath)) {
        console.warn(`    ⚠ Missing: ${slide.file}`);
        continue;
      }
      const html = readFile(slidePath);

      // Skip if already flattened (no partial markers)
      if (!html.includes("<!-- partial:")) {
        // Still regenerate topnav in case deck.json changed
        const topnavRegex = /<nav class="topnav">[\s\S]*?<\/nav>/;
        const newTopnav = generateTopnav(deck);
        if (topnavRegex.test(html)) {
          const updated = html.replace(topnavRegex, newTopnav);
          if (updated !== html) {
            writeFile(slidePath, updated);
            console.log(`    ✓ ${slide.file} (topnav refreshed)`);
          } else {
            console.log(`    ✓ ${slide.file} (already flattened)`);
          }
        } else {
          console.log(`    ✓ ${slide.file} (already flattened)`);
        }
        continue;
      }

      const processed = processSlide(html, deck, slide.file);
      writeFile(slidePath, processed);
      flattened++;
      console.log(`    ✓ ${slide.file}`);
    }

    // Copy shared assets into the deck directory
    const sharedCssSrc = path.join(SHARED_DIR, "shared.css");
    const sharedJsSrc = path.join(SHARED_DIR, "shared.js");
    const sharedCssDest = path.join(deckDir, "shared.css");
    const sharedJsDest = path.join(deckDir, "shared.js");

    fs.copyFileSync(sharedCssSrc, sharedCssDest);
    fs.copyFileSync(sharedJsSrc, sharedJsDest);
    console.log(`    ✓ shared.css, shared.js copied`);

    // Generate deck index page
    const indexPath = path.join(deckDir, "index.html");
    writeFile(indexPath, generateDeckIndex(deck));
    console.log(`    ✓ index.html generated`);

    console.log(`    ${flattened} slides flattened\n`);
  }

  // Generate root index
  const rootIndex = generateRootIndex(allDecks);
  writeFile(path.join(__dirname, "index.html"), rootIndex);
  console.log(`✅ Root index.html generated`);
  console.log(`\n✨ Done! Open index.html in your browser.`);
}

main();