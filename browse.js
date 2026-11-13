import {
  getAllBooks,
  syncCommunityCovers,
  loadFavorites,
  createBookCardElement,
  bindFooterContact,
  initAuthHeader,
  createDetailModalController
} from './shared.js';

const GENRES = [
  'All',
  'Fiction',
  'Sci-Fi & Fantasy',
  'Mystery & Noir',
  'Design & Art',
  'Classics',
  'Poetry',
  'Non-Fiction',
  'Community',
  'Favorites'
];

const params = new URLSearchParams(window.location.search);
const initialGenre = params.get('genre');

const state = {
  activeGenre: GENRES.includes(initialGenre) ? initialGenre : 'All',
  searchQuery: '',
  sortBy: 'featured'
};

const galleryGridEl = document.getElementById('galleryGrid');
const galleryEmptyEl = document.getElementById('galleryEmpty');
const coverCountPillEl = document.getElementById('coverCountPill');
const genreTabsEl = document.getElementById('genreTabs');
const searchInputEl = document.getElementById('searchInput');
const sortSelectEl = document.getElementById('sortSelect');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');

const detailModal = createDetailModalController({
  onBooksChanged: () => renderGallery()
});

function renderGenreTabs() {
  genreTabsEl.innerHTML = '';
  GENRES.forEach((genre) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `genre-tab${state.activeGenre === genre ? ' active' : ''}`;
    btn.textContent = genre;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', state.activeGenre === genre ? 'true' : 'false');
    btn.addEventListener('click', () => {
      state.activeGenre = genre;
      renderGenreTabs();
      renderGallery();
    });
    genreTabsEl.appendChild(btn);
  });
}

function getFilteredBooks() {
  let books = getAllBooks();

  if (state.activeGenre === 'Community') {
    books = books.filter((b) => b.isCommunity);
  } else if (state.activeGenre === 'Favorites') {
    const favSet = new Set(loadFavorites());
    books = books.filter((b) => favSet.has(b.id));
  } else if (state.activeGenre !== 'All') {
    books = books.filter((b) => b.genre === state.activeGenre);
  }

  const q = state.searchQuery.trim().toLowerCase();
  if (q) {
    books = books.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        (b.designer && b.designer.toLowerCase().includes(q)) ||
        b.genre.toLowerCase().includes(q)
    );
  }

  if (state.sortBy === 'title') {
    books = [...books].sort((a, b) => a.title.localeCompare(b.title));
  } else if (state.sortBy === 'author') {
    books = [...books].sort((a, b) => a.author.localeCompare(b.author));
  } else if (state.sortBy === 'year') {
    books = [...books].sort((a, b) => Number(b.year || 0) - Number(a.year || 0));
  }

  return books;
}

function renderGallery() {
  const filtered = getFilteredBooks();
  galleryGridEl.innerHTML = '';

  coverCountPillEl.textContent = `${filtered.length} ${filtered.length === 1 ? 'Cover' : 'Covers'}`;

  if (filtered.length === 0) {
    galleryEmptyEl.classList.remove('hidden');
    return;
  }

  galleryEmptyEl.classList.add('hidden');
  filtered.forEach((book) => {
    galleryGridEl.appendChild(createBookCardElement(book, detailModal.open, 'book-card-btn'));
  });
}

async function init() {
  initAuthHeader();
  await syncCommunityCovers();
  renderGenreTabs();
  renderGallery();

  let searchDebounceTimer = null;
  searchInputEl.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      renderGallery();
    }, 60);
  });

  sortSelectEl.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    renderGallery();
  });

  clearFiltersBtn.addEventListener('click', () => {
    state.activeGenre = 'All';
    state.searchQuery = '';
    state.sortBy = 'featured';
    searchInputEl.value = '';
    sortSelectEl.value = 'featured';
    renderGenreTabs();
    renderGallery();
  });

  bindFooterContact();
}

init();
