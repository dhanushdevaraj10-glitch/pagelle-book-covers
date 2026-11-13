/**
 * Generates high-craft editorial SVG book cover artwork as Data URIs.
 * Every cover has a subtle spine crease, paper grain texture, custom typography,
 * and distinct artistic composition so no external image URLs can ever break.
 */

export const STUDIO_PALETTES = {
  crimson: {
    bg: '#b82528',
    bg2: '#6b0f16',
    fg: '#f5efe6',
    accent: '#e2b97f',
    muted: '#e6c2b8'
  },
  midnight: {
    bg: '#161b28',
    bg2: '#0b0e16',
    fg: '#f3efe6',
    accent: '#c9ae8c',
    muted: '#8f9aa8'
  },
  forest: {
    bg: '#1c3a32',
    bg2: '#0f221d',
    fg: '#f2efe7',
    accent: '#d9a467',
    muted: '#9cb5aa'
  },
  cobalt: {
    bg: '#1c3d82',
    bg2: '#102454',
    fg: '#faf6ee',
    accent: '#ef7648',
    muted: '#a4b9e2'
  },
  terracotta: {
    bg: '#c7613f',
    bg2: '#7a311c',
    fg: '#fcf6ec',
    accent: '#f2d3a8',
    muted: '#f0cbb7'
  },
  plum: {
    bg: '#3f2038',
    bg2: '#220f1e',
    fg: '#f7edf2',
    accent: '#e3a697',
    muted: '#b996ad'
  },
  cream: {
    bg: '#e9e1d2',
    bg2: '#d5cbb7',
    fg: '#1a1917',
    accent: '#b83c2a',
    muted: '#5e594f'
  },
  ochre: {
    bg: '#d49a35',
    bg2: '#9a6818',
    fg: '#181512',
    accent: '#181512',
    muted: '#3b2e1b'
  },
  slate: {
    bg: '#2b3036',
    bg2: '#181b1f',
    fg: '#f0eee9',
    accent: '#78b0a0',
    muted: '#9ca3ad'
  },
  coral: {
    bg: '#d64c43',
    bg2: '#942822',
    fg: '#fff8f0',
    accent: '#f7d279',
    muted: '#f5bdb6'
  }
};

function escapeXml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapTitle(title, maxChars = 14) {
  const words = String(title || 'Untitled').trim().split(/\s+/);
  const lines = [];
  let current = '';

  for (const word of words) {
    if ((current + ' ' + word).trim().length <= maxChars) {
      current = (current + ' ' + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4);
}

function renderArtworkLayer(template, p, seed = 1) {
  const shift = ((seed * 37) % 24) - 12;

  switch (template) {
    case 'sunburst':
      return `
        <circle cx="150" cy="240" r="88" fill="${p.accent}" opacity="0.92"/>
        <circle cx="150" cy="240" r="62" fill="${p.bg}" opacity="0.25"/>
        <path d="M0 325 Q 75 ${290 + shift} 150 325 T 300 325 L 300 450 L 0 450 Z" fill="${p.bg2}" opacity="0.95"/>
        <path d="M0 355 Q 80 ${335 - shift} 165 360 T 300 350 L 300 450 L 0 450 Z" fill="${p.fg}" opacity="0.1"/>
        <line x1="28" y1="240" x2="272" y2="240" stroke="${p.fg}" stroke-width="1" opacity="0.35"/>
      `;

    case 'bauhaus':
      return `
        <rect x="28" y="170" width="118" height="118" fill="${p.accent}" opacity="0.92"/>
        <circle cx="212" cy="229" r="59" fill="${p.fg}" opacity="0.88"/>
        <path d="M28 310 L146 310 L146 410 Z" fill="${p.bg2}" opacity="0.85"/>
        <circle cx="212" cy="356" r="42" fill="none" stroke="${p.accent}" stroke-width="8"/>
        <line x1="28" y1="146" x2="272" y2="146" stroke="${p.fg}" stroke-width="2" opacity="0.7"/>
      `;

    case 'noir':
      return `
        <rect x="0" y="0" width="300" height="450" fill="url(#gradMain)"/>
        <polygon points="150,70 40,450 260,450" fill="${p.accent}" opacity="0.16"/>
        <circle cx="150" cy="185" r="44" fill="${p.accent}" opacity="0.9"/>
        <rect x="136" y="232" width="28" height="165" fill="${p.bg2}"/>
        <ellipse cx="150" cy="232" rx="34" ry="12" fill="${p.bg2}"/>
        <rect x="30" y="340" width="38" height="110" fill="${p.bg2}" opacity="0.8"/>
        <rect x="232" y="320" width="44" height="130" fill="${p.bg2}" opacity="0.85"/>
        <line x1="0" y1="398" x2="300" y2="398" stroke="${p.accent}" stroke-width="1.5" opacity="0.5"/>
      `;

    case 'cosmic':
      return `
        <circle cx="150" cy="250" r="96" fill="none" stroke="${p.accent}" stroke-width="1.4" opacity="0.55"/>
        <ellipse cx="150" cy="250" rx="126" ry="38" transform="rotate(-22 150 250)" fill="none" stroke="${p.fg}" stroke-width="1.5" opacity="0.75"/>
        <circle cx="150" cy="250" r="48" fill="${p.accent}"/>
        <circle cx="164" cy="238" r="46" fill="${p.bg2}" opacity="0.55"/>
        <circle cx="62" cy="170" r="3" fill="${p.fg}"/>
        <circle cx="242" cy="155" r="2.5" fill="${p.accent}"/>
        <circle cx="235" cy="340" r="3.5" fill="${p.fg}" opacity="0.8"/>
        <circle cx="75" cy="355" r="2" fill="${p.accent}"/>
        <circle cx="248" cy="212" r="9" fill="${p.fg}" opacity="0.9"/>
      `;

    case 'botanical':
      return `
        <rect x="26" y="26" width="248" height="398" fill="none" stroke="${p.accent}" stroke-width="1.2" opacity="0.5"/>
        <path d="M150 385 C148 310 152 240 150 165" stroke="${p.accent}" stroke-width="2.2" fill="none"/>
        <path d="M150 315 C110 295 92 260 112 240 C134 252 146 285 150 315 Z" fill="${p.accent}" opacity="0.88"/>
        <path d="M150 280 C192 260 208 222 186 205 C164 218 154 252 150 280 Z" fill="${p.fg}" opacity="0.85"/>
        <path d="M150 238 C115 215 104 185 124 170 C142 185 148 212 150 238 Z" fill="${p.fg}" opacity="0.7"/>
        <circle cx="150" cy="154" r="16" fill="${p.accent}"/>
        <circle cx="150" cy="154" r="7" fill="${p.bg}"/>
      `;

    case 'editorial':
      return `
        <rect x="0" y="0" width="300" height="118" fill="${p.accent}"/>
        <rect x="0" y="118" width="300" height="214" fill="${p.fg}"/>
        <rect x="0" y="332" width="300" height="118" fill="${p.bg2}"/>
        <circle cx="150" cy="225" r="64" fill="${p.bg}"/>
        <rect x="118" y="193" width="64" height="64" fill="none" stroke="${p.accent}" stroke-width="3"/>
      `;

    case 'brutalist':
      return `
        <rect x="20" y="20" width="260" height="410" fill="none" stroke="${p.fg}" stroke-width="3"/>
        <rect x="34" y="195" width="232" height="165" fill="${p.accent}"/>
        <polygon points="34,360 266,195 266,360" fill="${p.bg2}" opacity="0.45"/>
        <line x1="20" y1="175" x2="280" y2="175" stroke="${p.fg}" stroke-width="3"/>
      `;

    case 'archway':
    default:
      return `
        <path d="M58 450 L58 245 A92 92 0 0 1 242 245 L242 450 Z" fill="${p.bg2}"/>
        <path d="M84 450 L84 252 A66 66 0 0 1 216 252 L216 450 Z" fill="${p.accent}" opacity="0.9"/>
        <circle cx="150" cy="245" r="28" fill="${p.fg}" opacity="0.92"/>
        <rect x="132" y="315" width="36" height="135" fill="${p.bg}"/>
      `;
  }
}

export function generateBookCoverSvgDataUri({
  title = 'Untitled Book',
  author = 'Unknown Author',
  template = 'sunburst',
  palette = 'crimson',
  seed = 1
}) {
  const p = STUDIO_PALETTES[palette] || STUDIO_PALETTES.crimson;
  const lines = wrapTitle(title, template === 'brutalist' ? 11 : 14);
  const isEditorial = template === 'editorial';

  const titleColor = isEditorial ? p.bg2 : p.fg;
  const authorColor = isEditorial ? p.fg : p.muted;

  const titleStartY = isEditorial ? 196 : template === 'brutalist' ? 68 : 66;
  const lineHeight = template === 'brutalist' ? 32 : 28;
  const fontSize = template === 'brutalist' ? 28 : 24;
  const fontFamily = template === 'brutalist'
    ? "'Montserrat', Arial, sans-serif"
    : "'Playfair Display', Georgia, serif";

  const titleTextSvg = lines
    .map((line, i) => {
      const y = titleStartY + i * lineHeight;
      if (isEditorial) {
        return `<text x="150" y="${46 + i * 24}" text-anchor="middle" font-family="'Montserrat', Arial, sans-serif" font-weight="800" font-size="21" letter-spacing="1.5" fill="${p.bg2}">${escapeXml(line.toUpperCase())}</text>`;
      }
      return `<text x="150" y="${y}" text-anchor="middle" font-family="${fontFamily}" font-weight="700" font-size="${fontSize}" letter-spacing="0.4" fill="${titleColor}">${escapeXml(line)}</text>`;
    })
    .join('');

  const authorY = isEditorial ? 396 : 412;
  const upperAuthor = escapeXml(String(author || 'Author').toUpperCase());

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450" width="300" height="450">
    <defs>
      <linearGradient id="gradMain" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${p.bg}"/>
        <stop offset="100%" stop-color="${p.bg2}"/>
      </linearGradient>
      <linearGradient id="spineSheen" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#000000" stop-opacity="0.32"/>
        <stop offset="35%" stop-color="#ffffff" stop-opacity="0.14"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </linearGradient>
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.06"/>
        </feComponentTransfer>
      </filter>
    </defs>

    <rect width="300" height="450" fill="url(#gradMain)"/>
    ${renderArtworkLayer(template, p, seed)}

    ${titleTextSvg}

    <text x="150" y="${authorY}" text-anchor="middle" font-family="'Montserrat', Arial, sans-serif" font-weight="600" font-size="11" letter-spacing="2.2" fill="${authorColor}">${upperAuthor}</text>

    <!-- Subtle printed book spine crease -->
    <rect x="0" y="0" width="12" height="450" fill="url(#spineSheen)"/>
    <line x1="11" y1="0" x2="11" y2="450" stroke="#000000" stroke-opacity="0.18" stroke-width="1"/>
    <rect width="300" height="450" filter="url(#grain)" pointer-events="none"/>
  </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
