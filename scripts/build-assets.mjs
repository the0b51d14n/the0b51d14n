// Génère les SVG statiques du profil (couvertures de projets, séparateur, contact).
// Usage : node scripts/build-assets.mjs   (Node 18+, aucune dépendance)
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Tokens du portfolio obsiwebs.com
const C = {
  obsidian950: '#05060a', obsidian900: '#0a0c14', obsidian800: '#11141f', obsidian700: '#1a1e2e',
  violet: '#8b5cf6', blue: '#38bdf8', cyan: '#22d3ee', green: '#34d399',
  ink100: '#f4f6fb', ink300: '#c3c9da', ink500: '#8a92aa', ink700: '#5b6379',
};
const SANS = `Inter, 'Segoe UI', system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif`;
const MONO = `ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace`;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const STATUS = {
  'En ligne': C.green,
  'En cours': C.cyan,
  'Terminé': C.ink300,
};

const PROJECTS = [
  {
    file: 'codex-chronique',
    title: 'CODEX Chronique',
    tagline: "L'archive chronologique du jeu vidéo",
    kind: 'Projet personnel',
    status: 'En cours',
    motif: 'timeline',
  },
  {
    file: 'suptaskflow',
    title: 'SupTaskFlow',
    tagline: 'Gestion de tâches en Kanban',
    kind: 'Projet pédagogique',
    status: 'Terminé',
    motif: 'kanban',
  },
  {
    file: 'supinfo-tv-v2',
    title: 'Supinfo.TV V2',
    tagline: 'Plateforme e-commerce de films et séries',
    kind: 'Projet pédagogique',
    status: 'En ligne',
    motif: 'posters',
  },
  {
    file: 'supkrellm',
    title: 'SupKrellM',
    tagline: 'Moniteur système Linux en Python',
    kind: 'Projet pédagogique',
    status: 'Terminé',
    motif: 'monitor',
  },
];

const defs = `
    <linearGradient id="iris" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${C.violet}"/><stop offset=".45" stop-color="${C.cyan}"/><stop offset="1" stop-color="${C.green}"/>
    </linearGradient>
    <linearGradient id="surface" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".045"/><stop offset="1" stop-color="#fff" stop-opacity=".012"/>
    </linearGradient>
    <radialGradient id="spot" cx=".82" cy="0" r=".6">
      <stop offset="0" stop-color="${C.cyan}" stop-opacity=".13"/><stop offset="1" stop-color="${C.cyan}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="gridFade" cx=".8" cy=".5" r=".45">
      <stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#fff" fill-opacity=".1"/></pattern>`;

function panel(w, h, id) {
  return `
  <clipPath id="clip-${id}"><rect width="${w}" height="${h}" rx="18"/></clipPath>
  <mask id="mask-${id}"><rect width="${w}" height="${h}" fill="url(#gridFade)"/></mask>
  <g clip-path="url(#clip-${id})">
    <rect width="${w}" height="${h}" fill="${C.obsidian900}"/>
    <rect width="${w}" height="${h}" fill="url(#surface)"/>
    <rect width="${w}" height="${h}" fill="url(#grid)" mask="url(#mask-${id})"/>
    <rect width="${w}" height="${h}" fill="url(#spot)"/>
  </g>
  <rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="17.5" fill="none" stroke="#fff" stroke-opacity=".08"/>`;
}

// Motifs : chacun occupe la zone x ∈ [640, 950], y ∈ [36, 144]
const MOTIFS = {
  timeline() {
    const xs = [660, 712, 748, 800, 852, 884, 936];
    const hi = 4;
    let s = `<line x1="648" y1="96" x2="948" y2="96" stroke="#fff" stroke-opacity=".12" stroke-width="2"/>`;
    s += `<line x1="648" y1="96" x2="${xs[hi]}" y2="96" stroke="url(#iris)" stroke-width="2"/>`;
    xs.forEach((x, i) => {
      const up = i % 2 === 0;
      const y2 = up ? 62 - (i % 3) * 8 : 128 + (i % 3) * 6;
      s += `<line x1="${x}" y1="96" x2="${x}" y2="${y2}" stroke="#fff" stroke-opacity=".1"/>`;
      s += `<rect x="${x - 22}" y="${up ? y2 - 10 : y2}" width="44" height="10" rx="3" fill="#fff" fill-opacity="${i === hi ? 0 : 0.06}"/>`;
      if (i === hi) {
        s += `<circle cx="${x}" cy="96" r="14" fill="${C.cyan}" fill-opacity=".15"/>`;
        s += `<rect x="${x - 22}" y="${y2 - 10}" width="44" height="10" rx="3" fill="${C.cyan}" fill-opacity=".35"/>`;
      }
      s += `<circle cx="${x}" cy="96" r="${i === hi ? 5.5 : 4}" fill="${i <= hi ? C.cyan : C.obsidian700}" stroke="${i <= hi ? 'none' : C.ink700}"/>`;
    });
    return s;
  },
  kanban() {
    let s = '';
    const cols = [
      { x: 650, cards: [22, 30, 22] },
      { x: 752, cards: [30, 22] },
      { x: 854, cards: [22, 22, 30] },
    ];
    cols.forEach(({ x, cards }, ci) => {
      s += `<rect x="${x}" y="36" width="92" height="112" rx="10" fill="#fff" fill-opacity=".035" stroke="#fff" stroke-opacity=".07"/>`;
      s += `<rect x="${x + 10}" y="46" width="${28 + ci * 8}" height="5" rx="2.5" fill="${[C.violet, C.cyan, C.green][ci]}" fill-opacity=".8"/>`;
      let y = 60;
      cards.forEach((h, i) => {
        const ghost = ci === 1 && i === 1;
        s += `<rect x="${x + 8}" y="${y}" width="76" height="${h}" rx="6" fill="#fff" fill-opacity="${ghost ? 0 : 0.07}" ${ghost ? `stroke="${C.cyan}" stroke-opacity=".5" stroke-dasharray="4 3"` : ''}/>`;
        y += h + 6;
      });
    });
    // Carte en cours de glisser-déposer
    s += `<g transform="rotate(-6 820 118)"><rect x="782" y="104" width="76" height="26" rx="6" fill="${C.obsidian800}" stroke="${C.cyan}" stroke-opacity=".7"/>
      <rect x="792" y="113" width="40" height="4" rx="2" fill="${C.ink300}" fill-opacity=".6"/><rect x="792" y="120" width="26" height="3" rx="1.5" fill="${C.ink500}" fill-opacity=".5"/></g>`;
    return s;
  },
  posters() {
    let s = '';
    const colors = [C.violet, C.blue, C.cyan, C.green, C.violet];
    for (let i = 0; i < 5; i++) {
      const x = 648 + i * 62;
      const hi = i === 2;
      const y = hi ? 30 : 44;
      const h = hi ? 104 : 88;
      s += `<rect x="${x}" y="${y}" width="${hi ? 60 : 52}" height="${h}" rx="7" fill="${colors[i]}" fill-opacity="${hi ? 0.28 : 0.1}" stroke="${hi ? C.cyan : '#fff'}" stroke-opacity="${hi ? 0.7 : 0.08}"/>`;
      s += `<rect x="${x + 8}" y="${y + h - 20}" width="${hi ? 36 : 28}" height="4" rx="2" fill="#fff" fill-opacity="${hi ? 0.7 : 0.25}"/>`;
      if (hi) s += `<path d="M${x + 24} ${y + 40} l16 10 -16 10 z" fill="#fff" fill-opacity=".85"/>`;
    }
    // Pastille panier
    s += `<circle cx="920" cy="138" r="13" fill="${C.green}" fill-opacity=".18" stroke="${C.green}" stroke-opacity=".6"/>
      <text x="920" y="142.5" text-anchor="middle" font-family="${SANS}" font-size="12" font-weight="700" fill="${C.green}">3</text>`;
    return s;
  },
  monitor() {
    const pts = [18, 26, 22, 40, 34, 58, 46, 52, 70, 62, 84, 60, 66, 48, 56, 38, 44, 30, 36, 28];
    const x0 = 650, x1 = 948, base = 138, step = (x1 - x0) / (pts.length - 1);
    const line = pts.map((v, i) => `${(x0 + i * step).toFixed(1)},${base - v}`).join(' ');
    let s = `<defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.cyan}" stop-opacity=".3"/><stop offset="1" stop-color="${C.cyan}" stop-opacity="0"/></linearGradient></defs>`;
    for (let y = 58; y <= 138; y += 20) s += `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="#fff" stroke-opacity=".06"/>`;
    s += `<polygon points="${x0},${base} ${line} ${x1},${base}" fill="url(#area)"/>`;
    s += `<polyline points="${line}" fill="none" stroke="url(#iris)" stroke-width="2.5" stroke-linejoin="round"/>`;
    const peak = pts.indexOf(Math.max(...pts));
    s += `<circle cx="${x0 + peak * step}" cy="${base - pts[peak]}" r="4.5" fill="${C.ink100}"/>`;
    s += `<text x="${x0}" y="44" font-family="${MONO}" font-size="12" fill="${C.ink500}">cpu · mem · disk · net</text>`;
    return s;
  },
};

function cover(p, index) {
  const W = 1000, H = 180;
  const color = STATUS[p.status];
  const pillW = 26 + p.status.length * 7.6;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t">
  <title id="t">${esc(`${p.title} — ${p.tagline} (${p.kind.toLowerCase()}, ${p.status.toLowerCase()})`)}</title>
  <defs>${defs}</defs>
  ${panel(W, H, 'p')}
  <text x="48" y="58" font-family="${MONO}" font-size="13" fill="${C.ink700}" letter-spacing="2">${String(index + 1).padStart(2, '0')}</text>
  <text x="82" y="58" font-family="${SANS}" font-size="13" font-weight="500" fill="${C.ink500}" letter-spacing="2.6">${esc(p.kind.toUpperCase())}</text>
  <text x="46" y="110" font-family="${SANS}" font-size="42" font-weight="700" fill="${C.ink100}" letter-spacing="-1">${esc(p.title)}</text>
  <text x="48" y="144" font-family="${SANS}" font-size="19" fill="${C.ink300}">${esc(p.tagline)}</text>
  <g transform="translate(${596 - pillW} 36)">
    <rect width="${pillW}" height="26" rx="13" fill="${color}" fill-opacity=".1" stroke="${color}" stroke-opacity=".35"/>
    <circle cx="14" cy="13" r="3" fill="${color}"/>
    <text x="24" y="17.5" font-family="${SANS}" font-size="12.5" font-weight="500" fill="${color}">${esc(p.status)}</text>
  </g>
  ${MOTIFS[p.motif]()}
</svg>
`;
}

function divider() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="28" viewBox="0 0 1000 28" role="presentation" aria-hidden="true">
  <defs>
    <linearGradient id="l" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${C.violet}" stop-opacity="0"/>
      <stop offset=".3" stop-color="${C.violet}" stop-opacity=".55"/>
      <stop offset=".5" stop-color="${C.cyan}"/>
      <stop offset=".7" stop-color="${C.green}" stop-opacity=".55"/>
      <stop offset="1" stop-color="${C.green}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect x="80" y="13.5" width="840" height="1" fill="url(#l)"/>
  <rect x="495" y="9" width="10" height="10" rx="2" transform="rotate(45 500 14)" fill="${C.cyan}" fill-opacity=".2" stroke="${C.cyan}" stroke-opacity=".8"/>
</svg>
`;
}

function contact() {
  const W = 1000, H = 200;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t">
  <title id="t">Travaillons ensemble — un projet, une question sur mon parcours ? Ma boîte mail est ouverte.</title>
  <defs>${defs}
    <radialGradient id="halo"><stop offset="0" stop-color="${C.violet}" stop-opacity=".22"/><stop offset="1" stop-color="${C.violet}" stop-opacity="0"/></radialGradient>
  </defs>
  ${panel(W, H, 'c')}
  <ellipse cx="500" cy="100" rx="330" ry="110" fill="url(#halo)"/>
  <path id="orbit" d="M140 100 A360 80 0 1 0 860 100 A360 80 0 1 0 140 100" fill="none" stroke="url(#iris)" stroke-opacity=".3" stroke-width="1.5"/>
  <g>
    <circle r="16" fill="${C.cyan}" fill-opacity=".18"/><circle r="5" fill="${C.cyan}"/>
    <animateMotion dur="14s" repeatCount="indefinite"><mpath href="#orbit"/></animateMotion>
  </g>
  <text x="500" y="70" text-anchor="middle" font-family="${SANS}" font-size="13" font-weight="500" fill="${C.ink500}" letter-spacing="3.2">CONTACT</text>
  <text x="500" y="116" text-anchor="middle" font-family="${SANS}" font-size="38" font-weight="700" fill="url(#iris)" letter-spacing="-1">Travaillons ensemble</text>
  <text x="500" y="150" text-anchor="middle" font-family="${SANS}" font-size="17" fill="${C.ink300}">Un projet, une question sur mon parcours ? Ma boîte mail est ouverte.</text>
</svg>
`;
}

function write(rel, content) {
  const file = join(ROOT, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  console.log(`✓ ${rel} (${Buffer.byteLength(content)} o)`);
}

PROJECTS.forEach((p, i) => write(`assets/projects/${p.file}.svg`, cover(p, i)));
write('assets/divider.svg', divider());
write('assets/contact.svg', contact());
