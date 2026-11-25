import { CURATED_BOOKS, ESSENTIAL_COLLECTIONS } from './data.js';
import {
  loadUserBooks,
  syncCommunityCovers,
  getAllBooks,
  findBookById,
  createBookCardElement,
  bindSubscribeForm,
  bindFooterContact,
  initAuthHeader,
  createDetailModalController
} from './shared.js?v=2.1.3';

const HERO_SLOTS = [
  { left: '16%', top: '6%', rot: -8, z: 3 },
  { left: '31%', top: '2%', rot: 5, z: 6 },
  { left: '53%', top: '3%', rot: -4, z: 4 },
  { left: '66%', top: '9%', rot: 10, z: 7 },
  { left: '8%', top: '24%', rot: -11, z: 8 },
  { left: '22%', top: '27%', rot: 3, z: 5 },
  { left: '61%', top: '22%', rot: -6, z: 9 },
  { left: '74%', top: '26%', rot: 8, z: 10 },
  { left: '14%', top: '52%', rot: 6, z: 6 },
  { left: '30%', top: '56%', rot: -7, z: 8 },
  { left: '50%', top: '55%', rot: 5, z: 9 },
  { left: '65%', top: '48%', rot: -9, z: 5 }
];

const heroCollageEl = document.getElementById('heroCollage');
const carouselTrackEl = document.getElementById('carouselTrack');
const carouselViewportEl = document.getElementById('carouselViewport');
const carouselPrevBtn = document.getElementById('carouselPrev');
const carouselNextBtn = document.getElementById('carouselNext');
const collectionsGridEl = document.getElementById('collectionsGrid');

let lastWidth = window.innerWidth;

function updateHeroScale() {
  if (!heroCollageEl) return;
  const stage = heroCollageEl.parentElement;
  const container = stage?.closest('.container') || stage?.parentElement;
  const availWidth = Math.min(container ? container.clientWidth : window.innerWidth, window.innerWidth);
  const targetWidth = 820;
  const scale = availWidth < targetWidth ? Math.max(0.35, Math.min(1, availWidth / targetWidth)) : 1;
  document.documentElement.style.setProperty('--hero-scale', scale.toFixed(4));
}

const detailModal = createDetailModalController({
  onBooksChanged: () => {
    renderHeroCollage();
    renderCarousel();
  }
});

function renderHeroCollage() {
  if (!heroCollageEl) return;
  updateHeroScale();
  heroCollageEl.querySelectorAll('.hero-cover-item').forEach((node) => node.remove());

  const slots = HERO_SLOTS;
  const collageBooks = CURATED_BOOKS.slice(0, slots.length);
  collageBooks.forEach((book, idx) => {
    const slot = slots[idx];
    const item = document.createElement('div');
    item.className = 'hero-cover-item';
    item.style.left = slot.left;
    item.style.top = slot.top;
    item.style.zIndex = String(slot.z);
    item.style.transform = `rotate(${slot.rot}deg)`;
    item.title = `${book.title} by ${book.author}`;

    item.addEventListener('mouseenter', () => {
      item.style.zIndex = '25';
      item.style.transform = `rotate(${slot.rot}deg) scale(1.05)`;
    });
    item.addEventListener('mouseleave', () => {
      item.style.zIndex = String(slot.z);
      item.style.transform = `rotate(${slot.rot}deg)`;
    });

    const img = document.createElement('img');
    img.src = book.image;
    img.alt = `${book.title} cover`;
    img.decoding = 'async';
    item.appendChild(img);
    heroCollageEl.appendChild(item);
  });
}

function handleResize() {
  const currentWidth = window.innerWidth;
  // Prevent recalculation on mobile scroll where only height changes due to toolbar collapse
  if (Math.abs(currentWidth - lastWidth) > 3) {
    lastWidth = currentWidth;
    if (window.innerWidth <= 720) {
      document.documentElement.style.setProperty('--initial-hero-h', window.innerHeight + 'px');
    }
    updateHeroScale();
  }
}

window.addEventListener('resize', handleResize, { passive: true });
window.addEventListener('orientationchange', () => {
  lastWidth = window.innerWidth;
  if (window.innerWidth <= 720) {
    document.documentElement.style.setProperty('--initial-hero-h', window.innerHeight + 'px');
  }
  updateHeroScale();
}, { passive: true });

function renderCarousel() {
  carouselTrackEl.innerHTML = '';
  const userBooks = loadUserBooks();
  const carouselBooks = [
    ...userBooks,
    ...CURATED_BOOKS.filter((b) => b.featured),
    ...CURATED_BOOKS.filter((b) => !b.featured).slice(0, 6)
  ];

  const seen = new Set();
  for (const book of carouselBooks) {
    if (seen.has(book.id)) continue;
    seen.add(book.id);
    carouselTrackEl.appendChild(createBookCardElement(book, detailModal.open, 'carousel-card'));
  }
}

function renderCollections() {
  if (!collectionsGridEl) return;
  collectionsGridEl.innerHTML = '';

  const allBooks = getAllBooks();
  ESSENTIAL_COLLECTIONS.forEach((col) => {
    const books = allBooks.filter((b) => {
      if (!b || !b.id) return false;
      const bg = String(b.genre || '').toLowerCase().trim();
      const cg = String(col.genre || '').toLowerCase().trim();
      if (bg && cg && (bg === cg || bg.includes(cg) || cg.includes(bg))) return true;
      if (Array.isArray(col.bookIds) && col.bookIds.includes(b.id)) return true;
      return false;
    });

    // Skip collections that currently have no books
    if (!books || books.length === 0) return;

    const link = document.createElement('a');
    link.href = `collections.html?id=${encodeURIComponent(col.id)}`;
    link.className = 'collection-card';

    const fan = document.createElement('div');
    fan.className = 'collection-fan';

    books.slice(0, 4).forEach((book) => {
      const mini = document.createElement('div');
      mini.className = 'fan-cover';
      const img = document.createElement('img');
      img.src = book.image;
      img.alt = book.title;
      img.loading = 'lazy';
      img.decoding = 'async';
      mini.appendChild(img);
      fan.appendChild(mini);
    });

    const body = document.createElement('div');
    body.className = 'collection-body';

    const h3 = document.createElement('h3');
    h3.className = 'collection-title';
    h3.textContent = col.title;

    const p = document.createElement('p');
    p.className = 'collection-desc';
    p.textContent = col.description;

    body.appendChild(h3);
    body.appendChild(p);
    link.appendChild(fan);
    link.appendChild(body);
    collectionsGridEl.appendChild(link);
  });
}

async function init() {
  renderHeroCollage();
  renderCarousel();
  renderCollections();
  initAuthHeader();

  syncCommunityCovers().then(() => {
    renderCarousel();
  });

  carouselPrevBtn.addEventListener('click', () => {
    carouselViewportEl.scrollBy({ left: -420, behavior: 'smooth' });
  });
  carouselNextBtn.addEventListener('click', () => {
    carouselViewportEl.scrollBy({ left: 420, behavior: 'smooth' });
  });

  bindFooterContact();

  window.addEventListener('pagelle:covers:updated', () => {
    renderCarousel();
    renderCollections();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      syncCommunityCovers().then(() => {
        renderCarousel();
        renderCollections();
      });
    }
  });
}

init();
