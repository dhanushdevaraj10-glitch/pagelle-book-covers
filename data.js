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
  },
  {
    id: 'bk-13',
    title: 'Letters to Summer',
    author: 'Camille Laurent',
    genre: 'Fiction',
    year: '2024',
    designer: 'Editions Midi',
    template: 'archway',
    palette: 'terracotta',
    seed: 13,
    featured: false,
    desc: 'Unsent postcards found in a Mediterranean villa reveal forty years of quiet devotion.'
  },
  {
    id: 'bk-14',
    title: 'Echoes of Kepler',
    author: 'Nadia Volkov',
    genre: 'Sci-Fi & Fantasy',
    year: '2026',
    designer: 'Orbit Design',
    template: 'cosmic',
    palette: 'plum',
    seed: 14,
    featured: false,
    desc: 'First-contact linguistics meets deep-space solitude on a tidally locked exoplanet.'
  },
  {
    id: 'bk-15',
    title: 'Paper Lanterns',
    author: 'Haruki Sato',
    genre: 'Poetry',
    year: '2024',
    designer: 'Kyoto Press',
    template: 'sunburst',
    palette: 'cream',
    seed: 15,
    featured: false,
    desc: 'Minimalist verse inspired by dusk over mountain shrines and autumn river crossings.'
  },
  {
    id: 'bk-16',
    title: 'The Hollow Manor',
    author: 'Arthur Pendelton',
    genre: 'Mystery & Noir',
    year: '2023',
    designer: 'Blackwood Art',
    template: 'archway',
    palette: 'plum',
    seed: 16,
    featured: false,
    desc: 'Twelve guests snowbound in a Yorkshire estate must reconstruct a missing century of family history.'
  },
  {
    id: 'bk-17',
    title: 'Grid & Gesture',
    author: 'Hannah Lind',
    genre: 'Design & Art',
    year: '2025',
    designer: 'Formwerk',
    template: 'bauhaus',
    palette: 'cobalt',
    seed: 17,
    featured: false,
    desc: 'How geometric abstraction transformed mid-century paperback cover design across Europe and America.'
  },
  {
    id: 'bk-18',
    title: 'Beneath the Salt Line',
    author: 'Owen Gallagher',
    genre: 'Fiction',
    year: '2025',
    designer: 'Tide Press',
    template: 'editorial',
    palette: 'slate',
    seed: 18,
    featured: false,
    desc: 'A lighthouse keeper and a marine biologist spend one storm-swept winter documenting migrating whales.'
  },
  {
    id: 'bk-19',
    title: 'Atlas of Lost Voices',
    author: 'Elena Rostova',
    genre: 'Non-Fiction',
    year: '2024',
    designer: 'Meridian House',
    template: 'botanical',
    palette: 'midnight',
    seed: 19,
    featured: false,
    desc: 'A deeply researched cultural history of vanishing oral traditions and island dialects.'
  },
  {
    id: 'bk-20',
    title: 'Static in Neon',
    author: 'Devon Brooks',
    genre: 'Sci-Fi & Fantasy',
    year: '2025',
    designer: 'Chroma Press',
    template: 'brutalist',
    palette: 'cobalt',
    seed: 20,
    featured: false,
    desc: 'Pirate radio broadcasters in a rain-drenched megacity transmit banned memories across the grid.'
  },
  {
    id: 'bk-21',
    title: 'The Quiet Botanist',
    author: 'Margaux Delacroix',
    genre: 'Non-Fiction',
    year: '2023',
    designer: 'Jardin Books',
    template: 'botanical',
    palette: 'cream',
    seed: 21,
    featured: false,
    desc: 'The untold story of nineteenth-century illustrators who painted rare orchids by candlelight.'
  },
  {
    id: 'bk-22',
    title: 'Crimson Nocturne',
    author: 'Victor Thorne',
    genre: 'Mystery & Noir',
    year: '2025',
    designer: 'Velvet Ink',
    template: 'noir',
    palette: 'crimson',
    seed: 22,
    featured: false,
    desc: 'A jazz trumpeter becomes the sole witness to a disappearance on New Year’s Eve in 1962.'
  },
  {
    id: 'bk-23',
    title: 'Letters of Obsidian',
    author: 'Yuna Park',
    genre: 'Poetry',
    year: '2026',
    designer: 'Seoul Folio',
    template: 'editorial',
    palette: 'midnight',
    seed: 23,
    featured: false,
    desc: 'Sharp, luminous fragments exploring urban solitude, moonlight, and volcanic stone.'
  },
  {
    id: 'bk-24',
    title: 'The Bronze Observatory',
    author: 'Lucas Meyer',
    genre: 'Classics',
    year: '2022',
    designer: 'Clarendon Editions',
    template: 'cosmic',
    palette: 'terracotta',
    seed: 24,
    featured: false,
    desc: 'Restored 1920s essays on clockwork astrolabes, celestial mechanics, and human curiosity.'
  },
  {
    id: 'bk-25',
    title: 'Red Sun Over Harbor',
    author: 'Mei-Ling Zhou',
    genre: 'Fiction',
    year: '2025',
    designer: 'Harbor Studio',
    template: 'sunburst',
    palette: 'crimson',
    seed: 25,
    featured: false,
    desc: 'Three generations of shipbuilders navigate changing tides in a bustling southern port.'
  },
  {
    id: 'bk-26',
    title: 'Type & Temperament',
    author: 'Rolf Becker',
    genre: 'Design & Art',
    year: '2024',
    designer: 'Zurich Print',
    template: 'editorial',
    palette: 'coral',
    seed: 26,
    featured: false,
    desc: 'A practical handbook on expressive serif pairing, dust-jacket proportions, and ink contrast.'
  },
  {
    id: 'bk-27',
    title: 'Shadows of Antwerp',
    author: 'Pieter Vermeulen',
    genre: 'Mystery & Noir',
    year: '2024',
    designer: 'Canal Press',
    template: 'bauhaus',
    palette: 'slate',
    seed: 27,
    featured: false,
    desc: 'A diamond appraiser uncovers a century-old forgery ring hidden inside Flemish guild records.'
  },
  {
    id: 'bk-28',
    title: 'Wilderness of Mirrors',
    author: 'Clara Whitfield',
    genre: 'Classics',
    year: '2023',
    designer: 'Folio Archive',
    template: 'archway',
    palette: 'forest',
    seed: 28,
    featured: false,
    desc: 'Collected allegories on perception, labyrinthine libraries, and the craft of translation.'
  },
  {
    id: 'bk-29',
    title: 'The Saffron Almanac',
    author: 'Priya Nair',
    genre: 'Non-Fiction',
    year: '2026',
    designer: 'Spice & Reed',
    template: 'botanical',
    palette: 'ochre',
    seed: 29,
    featured: false,
    desc: 'A visual journey through ancient spice routes, hand-dyed textiles, and botanical pigments.'
  },
  {
    id: 'bk-30',
    title: 'Solstice in Stone',
    author: 'Gideon Shaw',
    genre: 'Poetry',
    year: '2025',
    designer: 'Monolith Press',
    template: 'brutalist',
    palette: 'plum',
    seed: 30,
    featured: false,
    desc: 'Sparse, architectural verses written among Neolithic standing stones in the Scottish Hebrides.'
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
    id: 'col-modernist',
    title: 'Timeless Literary & Dystopian Classics',
    description:
      'Iconic collector covers and enduring literary masterpieces from Franz Kafka, Albert Camus, George Orwell, and Frances Hodgson Burnett.',
    bookIds: ['bk-1', 'bk-2', 'bk-3', 'bk-8']
  },
  {
    id: 'col-literary',
    title: 'Modern Romance & Emotional Bestsellers',
    description:
      'Beloved contemporary novels featuring vibrant floral photography, satin ribbons, and unforgettable love stories.',
    bookIds: ['bk-4', 'bk-7', 'bk-10', 'bk-11', 'bk-12']
  },
  {
    id: 'col-cosmos',
    title: 'Young Adult Summer & Mystery Favorites',
    description:
      'Sunlit coastal escapes and unforgettable secrets captured in expressive coming-of-age jacket designs.',
    bookIds: ['bk-5', 'bk-6', 'bk-9', 'bk-10']
  }
];
