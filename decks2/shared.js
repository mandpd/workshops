// ===== Scroll-based sidebar notes =====
// Notes with data-for="section-id" become visible when that section is in view

function initSidebarNotes() {
  const notes = document.querySelectorAll('.sidebar-note[data-for]');
  if (!notes.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const id = entry.target.id;
        notes.forEach((note) => {
          if (note.dataset.for === id) {
            note.classList.toggle('visible', entry.isIntersecting);
          }
        });
      });
    },
    { rootMargin: '-20% 0px -60% 0px' }
  );

  document.querySelectorAll('.section[id]').forEach((section) => {
    observer.observe(section);
  });
}

// ===== Top nav active state =====
function initTopNav() {
  const currentPage = window.location.pathname.split('/').pop();
  const navLinks = document.querySelectorAll('.topnav-sections a');
  navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (href === currentPage) {
      link.classList.add('active');
    }
  });

  // In-page section highlighting (for anchor links)
  const sections = document.querySelectorAll('.section[id]');
  if (!sections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach((link) => {
            const href = link.getAttribute('href');
            if (href && href.includes('#' + id)) {
              link.classList.add('active');
            } else if (href && href.startsWith('#')) {
              link.classList.remove('active');
            }
          });
        }
      });
    },
    { rootMargin: '-30% 0px -60% 0px' }
  );

  sections.forEach((s) => observer.observe(s));
}

// ===== Fixed Footer Navigation =====
//
// initKeyNav(prevUrl, nextUrl, options?)
//
//   prevUrl     : string | null  — page to go to on ← / Prev button
//   nextUrl     : string | null  — page to go to on → / Next button
//   options     : object (all optional)
//     firstUrl  : string  — Home / first-slide button
//     lastUrl   : string  — End / last-slide button
//     current   : number  — current slide index (1-based)
//     total     : number  — total slide count
//     deckTitle : string  — shown on the left side of the footer
//
// The footer is injected into <body> if not already present.
// It takes its height from the CSS var --footer-height.
function initKeyNav(prevUrl, nextUrl, options = {}) {
  const { firstUrl, lastUrl, current, total, deckTitle } = options;

  // Remove any legacy auto-injected "Next →" link inside the last section.
  // (Older shared.js put nav at the bottom of the last section; footer replaces it.)
  document.querySelectorAll('.section-nav').forEach((el) => el.remove());

  // Build the footer once
  let footer = document.querySelector('.deck-footer');
  if (!footer) {
    footer = document.createElement('footer');
    footer.className = 'deck-footer';
    footer.innerHTML = `
      <div class="deck-footer-left"></div>
      <div class="deck-footer-center">
        <button type="button" class="footer-btn" data-action="first" title="First slide (Home)" aria-label="First slide">⇤</button>
        <a class="footer-btn footer-btn-prev" data-action="prev" title="Previous slide (←)" aria-label="Previous slide">← Prev</a>
        <a class="footer-btn footer-btn-next" data-action="next" title="Next slide (→)" aria-label="Next slide">Next →</a>
        <button type="button" class="footer-btn" data-action="last" title="Last slide (End)" aria-label="Last slide">⇥</button>
      </div>
      <div class="deck-footer-right"></div>
    `;
    document.body.appendChild(footer);
  }

  const leftSlot   = footer.querySelector('.deck-footer-left');
  const rightSlot  = footer.querySelector('.deck-footer-right');
  const btnFirst   = footer.querySelector('[data-action="first"]');
  const btnPrev    = footer.querySelector('[data-action="prev"]');
  const btnNext    = footer.querySelector('[data-action="next"]');
  const btnLast    = footer.querySelector('[data-action="last"]');

  // ---- Left slot: deck title (optional)
  if (deckTitle) {
    leftSlot.textContent = deckTitle;
    leftSlot.classList.add('has-content');
  }

  // ---- Right slot: slide counter (optional)
  if (typeof current === 'number' && typeof total === 'number') {
    rightSlot.innerHTML = `<span class="slide-counter">${current} / ${total}</span>`;
    rightSlot.classList.add('has-content');
  }

  // ---- Wire up prev/next
  if (prevUrl) {
    btnPrev.setAttribute('href', prevUrl);
  } else {
    btnPrev.classList.add('disabled');
    btnPrev.removeAttribute('href');
  }
  if (nextUrl) {
    btnNext.setAttribute('href', nextUrl);
  } else {
    btnNext.classList.add('disabled');
    btnNext.removeAttribute('href');
  }

  // ---- First / Last
  const go = (url) => { if (url) window.location.href = url; };

  if (firstUrl) {
    btnFirst.addEventListener('click', () => go(firstUrl));
  } else {
    btnFirst.classList.add('disabled');
    btnFirst.disabled = true;
  }

  if (lastUrl) {
    btnLast.addEventListener('click', () => go(lastUrl));
  } else {
    btnLast.classList.add('disabled');
    btnLast.disabled = true;
  }

  // ---- Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    switch (e.key) {
      case 'ArrowRight':
        if (nextUrl) { e.preventDefault(); go(nextUrl); }
        break;
      case 'ArrowLeft':
        if (prevUrl) { e.preventDefault(); go(prevUrl); }
        break;
      case 'Home':
        if (firstUrl) { e.preventDefault(); go(firstUrl); }
        break;
      case 'End':
        if (lastUrl) { e.preventDefault(); go(lastUrl); }
        break;
    }
  });
}

// ===== Scroll-triggered fade-in =====
function initScrollFade() {
  const els = document.querySelectorAll('.fade-on-scroll');
  if (!els.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { rootMargin: '0px 0px -10% 0px' }
  );

  els.forEach((el) => observer.observe(el));
}

// ===== Typewriter effect =====
function typewriter(el, text, speed = 30) {
  return new Promise((resolve) => {
    let i = 0;
    el.textContent = '';
    function tick() {
      if (i < text.length) {
        el.textContent += text[i];
        i++;
        setTimeout(tick, speed);
      } else {
        resolve();
      }
    }
    tick();
  });
}

// ===== Staggered appear =====
function staggerAppear(container, selector, delay = 100) {
  const items = container.querySelectorAll(selector);
  items.forEach((item, i) => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(8px)';
    item.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    setTimeout(() => {
      item.style.opacity = '1';
      item.style.transform = 'translateY(0)';
    }, i * delay);
  });
}

// ===== Wait helper =====
function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  initSidebarNotes();
  initTopNav();
  initScrollFade();
});