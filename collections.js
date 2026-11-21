import { ESSENTIAL_COLLECTIONS } from './data.js';
import {
  getAllBooks,
  getDeletedCoverIds,
  createBookCardElement,
  bindFooterContact,
  initAuthHeader,
  createDetailModalController,
  syncCommunityCovers
} from './shared.js?v=2.2.2';

function matchesGenre(bookGenre, targetGenre) {
  if (!bookGenre || !targetGenre) return false;
  const bg = String(bookGenre).toLowerCase().trim();
  const tg = String(targetGenre).toLowerCase().trim();
  if (bg === tg) return true;
  if ((tg.includes('sci-fi') || tg.includes('fantasy')) && (bg.includes('sci-fi') || bg.includes('fantasy'))) return true;
  if ((tg.includes('mystery') || tg.includes('noir') || tg.includes('thriller')) && (bg.includes('mystery') || bg.includes('noir') || bg.includes('thriller'))) return true;
  if ((tg.includes('design') || tg.includes('art')) && (bg.includes('design') || bg.includes('art'))) return true;
  if ((tg.includes('classic') || tg.includes('dystopian')) && (bg.includes('classic') || bg.includes('dystopian'))) return true;
  if (tg.includes('non-fiction') && (bg.includes('non-fiction') || bg === 'nonfiction')) return true;
  if (tg.includes('poetry') && bg.includes('poetry')) return true;
  return false;
}

const params = new URLSearchParams(window.location.search);
let selectedId = params.get('id');
const genreParam = params.get('genre');

// If URL has ?genre=Fiction or similar, automatically map to collection id
if (!selectedId && genreParam) {
  const matched = ESSENTIAL_COLLECTIONS.find((c) => matchesGenre(c.genre, genreParam));
  if (matched) selectedId = matched.id;
}

const overviewGridEl = document.getElementById('collectionsOverviewGrid');
const sectionsListEl = document.getElementById('collectionSectionsList');

const detailModal = createDetailModalController({
  onBooksChanged: () => {
    renderOverview();
    renderCollectionSections();
  }
});

function getBooksForCollection(col) {
  const allBooks = getAllBooks();
  const deletedIds = new Set(getDeletedCoverIds());
  const seenIds = new Set();
  const books = [];

  // Gather all matching community and curated books
  // (Since getAllBooks() puts newly uploaded/updated covers first, they appear at the top of the collection!)
  for (const b of allBooks) {
    if (!b || !b.id || deletedIds.has(b.id) || seenIds.has(b.id)) continue;
    let isMatch = false;

    if (col.genre && matchesGenre(b.genre, col.genre)) {
      isMatch = true;
    } else if (Array.isArray(col.genres) && col.genres.some((g) => matchesGenre(b.genre, g))) {
      isMatch = true;
    } else if (Array.isArray(col.bookIds) && col.bookIds.includes(b.id)) {
      isMatch = true;
    }

    if (isMatch) {
      seenIds.add(b.id);
      books.push(b);
    }
  }

  return books;
}

function renderOverview() {
  if (!overviewGridEl) return;
  overviewGridEl.innerHTML = '';

  ESSENTIAL_COLLECTIONS.forEach((col) => {
    const books = getBooksForCollection(col);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `collection-card${selectedId === col.id ? ' active' : ''}`;
    btn.addEventListener('click', () => {
      selectedId = col.id;
      renderOverview();
      const target = document.getElementById(`section-${col.id}`);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

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
    btn.appendChild(fan);
    btn.appendChild(body);
    overviewGridEl.appendChild(btn);
  });
}

function renderCollectionSections() {
  if (!sectionsListEl) return;
  sectionsListEl.innerHTML = '';

  ESSENTIAL_COLLECTIONS.forEach((col) => {
    const books = getBooksForCollection(col);

    const section = document.createElement('div');
    section.className = 'collection-detail-block';
    section.id = `section-${col.id}`;

    const header = document.createElement('div');
    header.className = 'section-header';

    const left = document.createElement('div');
    const title = document.createElement('h2');
    title.className = 'section-title';
    title.textContent = col.title;

    const desc = document.createElement('p');
    desc.className = 'collection-section-desc';
    desc.textContent = col.description;

    left.appendChild(title);
    left.appendChild(desc);

    const pill = document.createElement('span');
    pill.className = 'cover-count-pill';
    pill.textContent = `${books.length} Covers`;

    header.appendChild(left);
    header.appendChild(pill);

    const grid = document.createElement('div');
    grid.className = 'gallery-grid';
    books.forEach((book) => {
      grid.appendChild(createBookCardElement(book, detailModal.open, 'book-card-btn'));
    });

    section.appendChild(header);
    section.appendChild(grid);
    sectionsListEl.appendChild(section);
  });
}

async function init() {
  initAuthHeader();
  renderOverview();
  renderCollectionSections();
  bindFooterContact();

  // Background sync community covers to ensure newest updates appear immediately
  syncCommunityCovers().then(() => {
    renderOverview();
    renderCollectionSections();
  });

  window.addEventListener('pagelle:covers:updated', () => {
    renderOverview();
    renderCollectionSections();
  });

  if (selectedId) {
    const target = document.getElementById(`section-${selectedId}`);
    if (target) {
      setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    }
  }
}

init();
