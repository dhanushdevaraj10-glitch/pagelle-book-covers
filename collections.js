import { ESSENTIAL_COLLECTIONS } from './data.js';
import {
  findBookById,
  createBookCardElement,
  bindFooterContact,
  initAuthHeader,
  createDetailModalController
} from './shared.js';

const params = new URLSearchParams(window.location.search);
let selectedId = params.get('id');

const overviewGridEl = document.getElementById('collectionsOverviewGrid');
const sectionsListEl = document.getElementById('collectionSectionsList');

const detailModal = createDetailModalController();

function renderOverview() {
  overviewGridEl.innerHTML = '';

  ESSENTIAL_COLLECTIONS.forEach((col) => {
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

    col.bookIds
      .map((id) => findBookById(id))
      .filter(Boolean)
      .slice(0, 4)
      .forEach((book) => {
        const mini = document.createElement('div');
        mini.className = 'fan-cover';
        const img = document.createElement('img');
        img.src = book.image;
        img.alt = book.title;
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
  sectionsListEl.innerHTML = '';

  ESSENTIAL_COLLECTIONS.forEach((col) => {
    const books = col.bookIds.map((id) => findBookById(id)).filter(Boolean);

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

function init() {
  initAuthHeader();
  renderOverview();
  renderCollectionSections();
  bindFooterContact();

  if (selectedId) {
    const target = document.getElementById(`section-${selectedId}`);
    if (target) {
      setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    }
  }
}

init();
