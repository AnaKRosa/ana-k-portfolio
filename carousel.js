// carousel.js — reusable image carousel for case study pages.
// Native horizontal scroll + scroll-snap does the actual swiping; this
// script only syncs the arrows, dots, and "n / total" counter to that
// scroll position, and adds keyboard support.
//
// Markup contract (see social-media-case-study.html for a full example):
//   <div class="carousel" data-carousel>                 <!-- add "carousel--half" to show 2 slides at a time on desktop -->
//     <div class="carousel-track" data-track>
//       <div class="carousel-slide">...</div>
//       <div class="carousel-slide">...</div>
//     </div>
//     <button class="carousel-arrow carousel-arrow--prev" data-prev aria-label="Previous slide">‹</button>
//     <button class="carousel-arrow carousel-arrow--next" data-next aria-label="Next slide">›</button>
//     <div class="carousel-footer">
//       <div class="carousel-dots" data-dots></div>
//       <div class="carousel-counter" data-counter></div>
//     </div>
//   </div>
//
// A carousel with only one slide hides its own arrows/dots/counter
// automatically (class "is-single"). ".carousel--half" shows 2 slides at
// once above 640px and 1 below it — keep that breakpoint in sync with the
// matching CSS media query if it ever changes.

(function () {
  const GAP = 16; // must match .carousel-track { gap: ... } in CSS
  const HALF_BREAKPOINT = 640; // must match the ".carousel--half" CSS media query

  function initCarousel(root) {
    const track = root.querySelector('[data-track]');
    const prevBtn = root.querySelector('[data-prev]');
    const nextBtn = root.querySelector('[data-next]');
    const dotsWrap = root.querySelector('[data-dots]');
    const counter = root.querySelector('[data-counter]');
    if (!track) return;
    const slides = Array.from(track.children);

    if (slides.length <= 1) {
      root.classList.add('is-single');
      return;
    }

    const isHalf = root.classList.contains('carousel--half');
    const perView = () => (isHalf && window.innerWidth > HALF_BREAKPOINT ? 2 : 1);
    const maxIndex = () => Math.max(0, slides.length - perView());
    const slideStep = () => slides[0].getBoundingClientRect().width + GAP;

    const dots = [];
    if (dotsWrap) {
      dotsWrap.innerHTML = '';
      slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'carousel-dot';
        dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
        dot.addEventListener('click', () => scrollToIndex(i));
        dotsWrap.appendChild(dot);
        dots.push(dot);
      });
    }

    function currentIndex() {
      const step = slideStep();
      if (!step) return 0;
      return Math.round(track.scrollLeft / step);
    }

    function scrollToIndex(i) {
      const clamped = Math.max(0, Math.min(i, maxIndex()));
      track.scrollTo({ left: clamped * slideStep(), behavior: 'smooth' });
    }

    function update() {
      const idx = Math.min(currentIndex(), maxIndex());
      const pages = maxIndex() + 1;

      dots.forEach((dot, i) => dot.classList.toggle('is-active', i === idx));
      if (counter) counter.textContent = (idx + 1) + ' / ' + pages;
      if (prevBtn) prevBtn.disabled = idx <= 0;
      if (nextBtn) nextBtn.disabled = idx >= maxIndex();

      // A ".carousel--half" carousel with exactly 2 slides has nothing to
      // page through once both fit on screen at once (desktop) — hide the
      // controls for that state rather than showing a stuck "1 / 1".
      const singlePage = pages <= 1;
      if (dotsWrap) dotsWrap.style.display = singlePage ? 'none' : '';
      if (counter) counter.style.display = singlePage ? 'none' : '';
      if (prevBtn) prevBtn.style.display = singlePage ? 'none' : '';
      if (nextBtn) nextBtn.style.display = singlePage ? 'none' : '';
    }

    if (prevBtn) prevBtn.addEventListener('click', () => scrollToIndex(currentIndex() - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => scrollToIndex(currentIndex() + 1));

    let scrollRaf = null;
    track.addEventListener('scroll', () => {
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      scrollRaf = requestAnimationFrame(update);
    }, { passive: true });

    root.setAttribute('tabindex', '0');
    root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); scrollToIndex(currentIndex() - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); scrollToIndex(currentIndex() + 1); }
    });

    let resizeRaf = null;
    window.addEventListener('resize', () => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(update);
    });

    update();
    window.addEventListener('load', update);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-carousel]').forEach(initCarousel);
  });
})();
