import { generateBookCoverSvgDataUri } from './covers-art.js';

const RAW_BOOKS = [
  {
    id: 'bk-1',
    title: 'The Metamorphosis',
    author: 'Franz Kafka',
    genre: 'Classics',
    year: '1915',
    designer: 'All Time Classics',
    image: 'assets/covers/the-metamorphosis.jpg',
    featured: true,
    desc: 'Franz Kafka’s iconic existential novella following Gregor Samsa, who awakens one morning transformed into a giant insect.'
  },
  {
    id: 'bk-2',
    title: 'The Stranger',
    author: 'Albert Camus',
    genre: 'Classics',
    year: '1942',
    designer: 'Vintage / Knopf Edition',
    image: 'assets/covers/the-stranger.jpg',
    featured: true,
    desc: 'Albert Camus’s landmark philosophical novel exploring absurdity, alienation, and truth under the blazing Algerian sun.'
  },
  {
    id: 'bk-3',
    title: 'The Secret Garden',
    author: 'Frances Hodgson Burnett',
    genre: 'Classics',
    year: '1911',
    designer: 'Graham Rust Illustrated',
    image: 'assets/covers/the-secret-garden.jpg',
    featured: true,
    desc: 'A timeless botanical classic illustrated by Graham Rust, telling the story of a hidden walled garden and quiet renewal.'
  },
  {
    id: 'bk-4',
    title: 'Finding Perfect',
    author: 'Colleen Hoover',
    genre: 'Fiction',
    year: '2019',
    designer: 'Atria / Simon & Schuster',
    image: 'assets/covers/finding-perfect.jpg',
    featured: true,
    desc: 'An emotional novella about love, forgiveness, and second chances wrapped in a vivid crimson satin ribbon motif.'
  },
  {
    id: 'bk-5',
    title: 'If He Had Been with Me',
    author: 'Laura Nowlin',
    genre: 'Fiction',
    year: '2013',
    designer: 'Sourcebooks Fire',
    image: 'assets/covers/if-he-had-been-with-me.jpg',
    featured: true,
    desc: 'A poignant coming-of-age story of childhood friends Autumn and Finn, defined by everything left unsaid.'
  },
  {
    id: 'bk-6',
    title: 'We Were Liars',
    author: 'E. Lockhart',
    genre: 'Mystery & Noir',
    year: '2014',
    designer: 'Delacorte Press',
    image: 'assets/covers/we-were-liars.jpg',
    featured: true,
    desc: 'A haunting psychological suspense novel set on a private island where privilege hides an unforgettable secret.'
  },
  {
    id: 'bk-7',
    title: 'Things We Never Got Over',
    author: 'Lucy Score',
    genre: 'Fiction',
    year: '2022',
    designer: 'Bloom Books',
    image: 'assets/covers/things-we-never-got-over.jpg',
    featured: true,
    desc: 'A small-town contemporary romance dotted with fresh white daisies about starting over when plans fall apart.'
  },
  {
    id: 'bk-8',
    title: '1984',
    author: 'George Orwell',
    genre: 'Classics',
    year: '1949',
    designer: 'Collector Poster Edition',
    image: 'assets/covers/1984.jpg',
    featured: true,
    desc: 'George Orwell’s dystopian masterpiece framed in bold crimson stencil typography and all-seeing surveillance imagery.'
  },
  {
    id: 'bk-9',
    title: 'The Summer I Turned Pretty',
    author: 'Jenny Han',
    genre: 'Fiction',
    year: '2009',
    designer: 'Simon & Schuster',
    image: 'assets/covers/the-summer-i-turned-pretty.jpg',
    featured: true,
    desc: 'Every summer at Cousins Beach brings new seashells, sunlit memories, and the bittersweet thrill of growing up.'
  },
  {
    id: 'bk-10',
    title: 'It Starts with Us',
    author: 'Colleen Hoover',
    genre: 'Fiction',
    year: '2022',
    designer: 'Atria Books',
    image: 'assets/covers/it-starts-with-us.jpg',
    featured: true,
    desc: 'The awaited companion to It Ends with Us, featuring floating daffodils across sunlit cerulean water.'
  },
  {
    id: 'bk-11',
    title: 'The Notebook',
    author: 'Nicholas Sparks',
    genre: 'Fiction',
    year: '1996',
    designer: 'Grand Central Publishing',
    image: 'assets/covers/the-notebook.jpg',
    featured: true,
    desc: 'An enduring love story capturing Noah and Allie’s unforgettable summer and lifelong devotion.'
  },
  {
    id: 'bk-12',
    title: 'It Ends with Us',
    author: 'Colleen Hoover',
    genre: 'Fiction',
    year: '2016',
    designer: 'Atria Books',
    image: 'assets/covers/it-ends-with-us.jpg',
    featured: true,
    desc: 'A bold portrait of resilience and difficult choices, framed by shattered pink orchid petals on pale oak.'
  }
];

export const CURATED_BOOKS = RAW_BOOKS.map((book) => ({
  ...book,
  image:
    book.image ||
    generateBookCoverSvgDataUri({
      title: book.title,
      author: book.author,
      template: book.template,
      palette: book.palette,
      seed: book.seed
    }),
  isCommunity: false
}));

export const ESSENTIAL_COLLECTIONS = [
  {
    id: 'col-literary',
    genre: 'Fiction',
    title: 'Modern Fiction & Contemporary Bestsellers',
    description:
      'Compelling storytelling, vibrant jacket art, emotional journeys, and acclaimed modern editions.',
    bookIds: ['bk-4', 'bk-5', 'bk-7', 'bk-9', 'bk-10', 'bk-11', 'bk-12']
  },
  {
    id: 'col-modernist',
    genre: 'Classics',
    title: 'Timeless Literary & Dystopian Classics',
    description:
      'Iconic collector covers, enduring masterpieces, and existential literature from Franz Kafka, Albert Camus, George Orwell, and classic authors.',
    bookIds: ['bk-1', 'bk-2', 'bk-3', 'bk-8']
  },
  {
    id: 'col-cosmos',
    genre: 'Mystery & Noir',
    title: 'Mystery, Suspense & Noir Crime',
    description:
      'Atmospheric crime fiction, investigative tension, noir typography, and captivating thrillers.',
    bookIds: ['bk-6']
  },
  {
    id: 'col-scifi',
    genre: 'Sci-Fi & Fantasy',
    title: 'Sci-Fi, Speculative & Cosmic Visions',
    description:
      'Futuristic jacket art, interstellar voyages, dystopian epics, and imaginative world-building.',
    bookIds: []
  },
  {
    id: 'col-design',
    genre: 'Design & Art',
    title: 'Design, Typography & Visual Arts',
    description:
      'Masterclass editorial layouts, Swiss typography, bold palettes, and visual monographs.',
    bookIds: []
  },
  {
    id: 'col-nonfiction',
    genre: 'Non-Fiction',
    title: 'Non-Fiction, Essays & Memoirs',
    description:
      'Thought-provoking biographies, philosophy, lived histories, and groundbreaking real-world chronicles.',
    bookIds: []
  },
  {
    id: 'col-poetry',
    genre: 'Poetry',
    title: 'Poetry & Expressive Verse',
    description:
      'Soul-stirring verses, lyricism, and poignant poetic anthologies in minimal jacket editions.',
    bookIds: []
  }
];
