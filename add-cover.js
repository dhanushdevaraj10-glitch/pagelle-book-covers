import { generateBookCoverSvgDataUri } from './covers-art.js';
import {
  loadUserBooks,
  syncCommunityCovers,
  publishCommunityCover,
  createBookCardElement,
  bindFooterContact,
  initAuthHeader,
  createDetailModalController,
  getCurrentSession,
  showToast
} from './shared.js';

let sourceMode = 'upload';
let uploadedDataUri = '';

const addCoverFormEl = document.getElementById('addCoverForm');
const sourceTabEls = document.querySelectorAll('.source-tab');
const panelUploadEl = document.getElementById('panelUpload');
const panelStudioEl = document.getElementById('panelStudio');
const panelUrlEl = document.getElementById('panelUrl');
const uploadDropzoneEl = document.getElementById('uploadDropzone');
const coverFileInputEl = document.getElementById('coverFileInput');
const uploadFileNameEl = document.getElementById('uploadFileName');
const studioTemplateEl = document.getElementById('studioTemplate');
const studioPaletteEl = document.getElementById('studioPalette');
const coverUrlInputEl = document.getElementById('coverUrlInput');
const bookTitleInputEl = document.getElementById('bookTitleInput');
const bookAuthorInputEl = document.getElementById('bookAuthorInput');
const bookGenreInputEl = document.getElementById('bookGenreInput');
const bookYearInputEl = document.getElementById('bookYearInput');
const bookDesignerInputEl = document.getElementById('bookDesignerInput');
const bookDescInputEl = document.getElementById('bookDescInput');
const addFormErrorEl = document.getElementById('addFormError');

const livePreviewFrameEl = document.getElementById('livePreviewFrame');
const livePreviewTitleEl = document.getElementById('livePreviewTitle');
const livePreviewAuthorEl = document.getElementById('livePreviewAuthor');
const livePreviewGenreEl = document.getElementById('livePreviewGenre');

const publishSuccessBannerEl = document.getElementById('publishSuccessBanner');
const publishSuccessTitleEl = document.getElementById('publishSuccessTitle');

const mySubmissionsGridEl = document.getElementById('mySubmissionsGrid');
const mySubmissionsEmptyEl = document.getElementById('mySubmissionsEmpty');
const mySubmissionsCountEl = document.getElementById('mySubmissionsCount');

const detailModal = createDetailModalController({
  onBooksChanged: () => renderMySubmissions()
});

function switchSourceMode(mode) {
  sourceMode = mode;
  sourceTabEls.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.sourceMode === mode);
  });
  panelUploadEl.classList.toggle('hidden', mode !== 'upload');
  panelStudioEl.classList.toggle('hidden', mode !== 'studio');
  panelUrlEl.classList.toggle('hidden', mode !== 'url');
  addFormErrorEl.classList.add('hidden');
  updateLivePreview();
}

function getPreviewImageSrc() {
  const title = bookTitleInputEl.value.trim() || "The Cartographer's Dream";
  const author = bookAuthorInputEl.value.trim() || 'Elena Vance';

  if (sourceMode === 'upload' && uploadedDataUri) {
    return uploadedDataUri;
  }
  if (sourceMode === 'url' && coverUrlInputEl.value.trim()) {
    return coverUrlInputEl.value.trim();
  }
  return generateBookCoverSvgDataUri({
    title,
    author,
    template: studioTemplateEl.value,
    palette: studioPaletteEl.value,
    seed: title.length + author.length
  });
}

function updateLivePreview() {
  const title = bookTitleInputEl.value.trim() || "The Cartographer's Dream";
  const author = bookAuthorInputEl.value.trim() || 'Elena Vance';

  livePreviewTitleEl.textContent = title;
  livePreviewAuthorEl.textContent = `by ${author}`;
  livePreviewGenreEl.textContent = bookGenreInputEl.value || 'Fiction';

  const src = getPreviewImageSrc();
  livePreviewFrameEl.innerHTML = '';
  const img = document.createElement('img');
  img.src = src;
  img.alt = 'Book cover preview';
  img.onerror = () => {
    img.src = generateBookCoverSvgDataUri({
      title,
      author,
      template: 'noir',
      palette: 'midnight',
      seed: 3
    });
  };
  livePreviewFrameEl.appendChild(img);
}

function showFormError(msg) {
  addFormErrorEl.textContent = msg;
  addFormErrorEl.classList.remove('hidden');
}

function processUploadedFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    showFormError('Please select a valid image file (PNG, JPG, WEBP, or SVG).');
    return;
  }

  uploadFileNameEl.textContent = file.name;
  addFormErrorEl.classList.add('hidden');

  if (file.type === 'image/svg+xml') {
    const reader = new FileReader();
    reader.onload = () => {
      uploadedDataUri = String(reader.result || '');
      updateLivePreview();
    };
    reader.readAsDataURL(file);
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const rawImg = new Image();
    rawImg.onload = () => {
      const maxWidth = 540;
      const maxHeight = 810;
      let { width, height } = rawImg;
      const scale = Math.min(1, maxWidth / width, maxHeight / height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(rawImg, 0, 0, width, height);
      uploadedDataUri = canvas.toDataURL('image/jpeg', 0.86);
      updateLivePreview();
    };
    rawImg.src = String(reader.result || '');
  };
  reader.readAsDataURL(file);
}

function renderMySubmissions() {
  const userBooks = loadUserBooks();
  mySubmissionsGridEl.innerHTML = '';
  mySubmissionsCountEl.textContent = `${userBooks.length} ${userBooks.length === 1 ? 'Cover' : 'Covers'}`;

  if (userBooks.length === 0) {
    mySubmissionsEmptyEl.classList.remove('hidden');
    return;
  }

  mySubmissionsEmptyEl.classList.add('hidden');
  userBooks.forEach((book) => {
    mySubmissionsGridEl.appendChild(createBookCardElement(book, detailModal.open, 'book-card-btn'));
  });
}

async function handleSubmit(e) {
  e.preventDefault();
  addFormErrorEl.classList.add('hidden');

  const title = bookTitleInputEl.value.trim();
  const author = bookAuthorInputEl.value.trim();

  if (!title) {
    showFormError('Please enter a book title.');
    bookTitleInputEl.focus();
    return;
  }
  if (!author) {
    showFormError('Please enter the author name.');
    bookAuthorInputEl.focus();
    return;
  }
  if (sourceMode === 'upload' && !uploadedDataUri) {
    showFormError('Please upload a book cover image, or switch to Cover Studio to generate one.');
    return;
  }
  if (sourceMode === 'url' && !coverUrlInputEl.value.trim()) {
    showFormError('Please enter a valid cover image URL.');
    coverUrlInputEl.focus();
    return;
  }

  const session = getCurrentSession();
  const newBook = {
    id: `user-${Date.now()}`,
    title,
    author,
    genre: bookGenreInputEl.value || 'Fiction',
    year: bookYearInputEl.value.trim() || String(new Date().getFullYear()),
    designer: bookDesignerInputEl.value.trim() || (session && session.name ? session.name : 'Community Creator'),
    desc:
      bookDescInputEl.value.trim() ||
      `Community-submitted book cover edition for "${title}" by ${author}.`,
    image: getPreviewImageSrc(),
    isCommunity: true,
    submittedById: session ? (session.userId || session.id || '') : '',
    submittedByName: session && session.name ? session.name : 'Community Creator',
    submittedByEmail: session && session.email ? session.email : '',
    submittedByUsername: session && session.username ? session.username : '',
    createdAt: new Date().toISOString()
  };

  try {
    await publishCommunityCover(newBook);
  } catch (err) {
    showFormError(err.message || 'Could not publish cover.');
    return;
  }

  addCoverFormEl.reset();
  uploadedDataUri = '';
  uploadFileNameEl.textContent = 'Drop your cover image here or click to browse';
  switchSourceMode('upload');

  publishSuccessTitleEl.textContent = `"${newBook.title}" published!`;
  const collectionsBtn = document.getElementById('publishSuccessCollectionsBtn');
  if (collectionsBtn) {
    collectionsBtn.href = `collections.html?genre=${encodeURIComponent(newBook.genre || 'Fiction')}`;
  }
  publishSuccessBannerEl.classList.remove('hidden');
  renderMySubmissions();
  showToast(`"${newBook.title}" added to the archive!`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function init() {
  initAuthHeader();
  updateLivePreview();
  await syncCommunityCovers();
  renderMySubmissions();
  bindFooterContact();

  window.addEventListener('pagelle:covers:updated', () => {
    renderMySubmissions();
  });

  sourceTabEls.forEach((tab) => {
    tab.addEventListener('click', () => switchSourceMode(tab.dataset.sourceMode));
  });

  coverFileInputEl.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) processUploadedFile(file);
  });

  uploadDropzoneEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadDropzoneEl.classList.add('dragover');
  });
  uploadDropzoneEl.addEventListener('dragleave', () => {
    uploadDropzoneEl.classList.remove('dragover');
  });
  uploadDropzoneEl.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadDropzoneEl.classList.remove('dragover');
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) processUploadedFile(file);
  });

  [
    bookTitleInputEl,
    bookAuthorInputEl,
    bookGenreInputEl,
    studioTemplateEl,
    studioPaletteEl,
    coverUrlInputEl
  ].forEach((el) => {
    el.addEventListener('input', updateLivePreview);
    el.addEventListener('change', updateLivePreview);
  });

  addCoverFormEl.addEventListener('submit', handleSubmit);
}

init();
