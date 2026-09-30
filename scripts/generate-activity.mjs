// Génère dist/activity.svg (publié sur la branche « output ») à partir de l'API GraphQL GitHub.
// Usage : GITHUB_TOKEN=… node scripts/generate-activity.mjs [login] [sortie]
// En cas d'erreur, le script échoue sans écrire : l'ancien SVG reste en place.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const LOGIN = process.argv[2] || process.env.PROFILE_LOGIN || 'the0b51d14n';
const OUT = process.argv[3] || 'dist/activity.svg';
const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) {
  console.error('GITHUB_TOKEN manquant.');
  process.exit(1);
}

const C = {
  obsidian950: '#05060a', obsidian900: '#0a0c14', obsidian700: '#1a1e2e',
  violet: '#8b5cf6', blue: '#38bdf8', cyan: '#22d3ee', green: '#34d399',
  ink100: '#f4f6fb', ink300: '#c3c9da', ink500: '#8a92aa', ink700: '#5b6379',
};
const SANS = `Inter, 'Segoe UI', system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif`;
const MONO = `ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace`;
const LEVEL = {
  NONE: ['#ffffff', 0.05],
  FIRST_QUARTILE: [C.violet, 0.55],
  SECOND_QUARTILE: [C.blue, 0.75],
  THIRD_QUARTILE: [C.cyan, 0.9],
  FOURTH_QUARTILE: [C.green, 1],
};
const LANG_COLORS = [C.violet, C.blue, C.cyan, C.green, C.ink300, C.ink700];
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

const query = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount contributionLevel } }
      }
    }
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC) {
      totalCount
      nodes { languages(first: 10, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name } } } }
    }
  }
}`;

const res = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'obsiwebs-profile' },
  body: JSON.stringify({ query, variables: { login: LOGIN } }),
});
const json = await res.json();
if (!res.ok || json.errors || !json.data?.user) {
  console.error('Réponse GitHub invalide :', res.status, JSON.stringify(json.errors ?? json).slice(0, 500));
  process.exit(1);
}

const { user } = json.data;
const cal = user.contributionsCollection.contributionCalendar;
const weeks = cal.weeks;
const days = weeks.flatMap((w) => w.contributionDays);

// Statistiques calculées uniquement à partir du calendrier GitHub
const activeDays = days.filter((d) => d.contributionCount > 0).length;
let longest = 0, run = 0;
for (const d of days) {
  run = d.contributionCount > 0 ? run + 1 : 0;
  longest = Math.max(longest, run);
}
const repoCount = user.repositories.totalCount;

// Langages des dépôts publics (volume de code en octets)
const totals = new Map();
for (const repo of user.repositories.nodes) {
  for (const { size, node } of repo.languages.edges) totals.set(node.name, (totals.get(node.name) || 0) + size);
}
const sum = [...totals.values()].reduce((a, b) => a + b, 0) || 1;
let langs = [...totals.entries()].sort((a, b) => b[1] - a[1]);
const top = langs.slice(0, 5);
const rest = langs.slice(5).reduce((a, [, v]) => a + v, 0);
if (rest > 0) top.push(['Autres', rest]);
langs = top.map(([name, v], k) => ({ name, pct: (v / sum) * 100, color: LANG_COLORS[k] }));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (n) => n.toLocaleString('fr-FR').replace(/ | /g, ' ');
const updated = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });

// ---- Rendu -----------------------------------------------------------------
const W = 1000, H = 440;
const CELL = 12, GAP = 3, STEP = CELL + GAP;
const gridW = weeks.length * STEP - GAP;
const gx = Math.round((W - gridW) / 2), gy = 190;

let cells = '';
weeks.forEach((w, wi) => {
  w.contributionDays.forEach((d) => {
    const dow = new Date(d.date + 'T00:00:00Z').getUTCDay();
    const [color, op] = LEVEL[d.contributionLevel] ?? LEVEL.NONE;
    cells += `<rect x="${gx + wi * STEP}" y="${gy + dow * STEP}" width="${CELL}" height="${CELL}" rx="3" fill="${color}" fill-opacity="${op}"/>`;
  });
});

let months = '';
let lastMonth = -1;
weeks.forEach((w, wi) => {
  const first = w.contributionDays[0];
  const m = new Date(first.date + 'T00:00:00Z').getUTCMonth();
  if (m !== lastMonth && wi < weeks.length - 2) {
    if (lastMonth !== -1 || new Date(first.date + 'T00:00:00Z').getUTCDate() <= 7) {
      months += `<text x="${gx + wi * STEP}" y="${gy - 10}">${MONTHS[m]}</text>`;
    }
    lastMonth = m;
  }
});

const stats = [
  [fmt(cal.totalContributions), 'contributions sur 12 mois'],
  [fmt(activeDays), 'jours actifs'],
  [fmt(longest), 'jours · plus longue série'],
  [fmt(repoCount), 'dépôts publics'],
];
const colW = (W - 96) / stats.length;
const statsSvg = stats.map(([v, label], k) => {
  const x = 48 + k * colW;
  return `<text x="${x}" y="120" font-family="${SANS}" font-size="40" font-weight="700" fill="${k === 0 ? 'url(#iris)' : C.ink100}" letter-spacing="-1">${esc(v)}</text>
    <text x="${x + 2}" y="146" font-family="${SANS}" font-size="14" fill="${C.ink500}">${esc(label)}</text>`;
}).join('\n  ');

const barX = 48, barW = W - 96, barY = 348;
let acc = 0;
const bar = langs.map((l) => {
  const w = (l.pct / 100) * barW;
  const r = `<rect x="${(barX + acc).toFixed(1)}" y="${barY}" width="${Math.max(w - 2, 1).toFixed(1)}" height="8" fill="${l.color}"/>`;
  acc += w;
  return r;
}).join('');
const legendStep = barW / langs.length;
const legend = langs.map((l, k) => {
  const x = barX + k * legendStep;
  return `<circle cx="${x + 5}" cy="${barY + 32}" r="4.5" fill="${l.color}"/>
    <text x="${x + 16}" y="${barY + 37}" font-family="${SANS}" font-size="14" fill="${C.ink300}">${esc(l.name)} <tspan fill="${C.ink500}">${l.pct.toFixed(1).replace('.', ',')} %</tspan></text>`;
}).join('\n  ');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d">
  <title id="t">Activité GitHub de ${esc(LOGIN)}</title>
  <desc id="d">${esc(`${cal.totalContributions} contributions sur les 12 derniers mois, ${activeDays} jours actifs, plus longue série de ${longest} jours, ${repoCount} dépôts publics. Langages principaux des dépôts publics : ${langs.map((l) => `${l.name} ${l.pct.toFixed(0)} %`).join(', ')}.`)}</desc>
  <defs>
    <linearGradient id="iris" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${C.violet}"/><stop offset=".45" stop-color="${C.cyan}"/><stop offset="1" stop-color="${C.green}"/>
    </linearGradient>
    <linearGradient id="surface" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".045"/><stop offset="1" stop-color="#fff" stop-opacity=".012"/>
    </linearGradient>
    <linearGradient id="scan" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${C.cyan}" stop-opacity="0"/>
      <stop offset=".75" stop-color="${C.cyan}" stop-opacity=".22"/>
      <stop offset="1" stop-color="#e0fbff" stop-opacity=".75"/>
    </linearGradient>
    <clipPath id="card"><rect width="${W}" height="${H}" rx="18"/></clipPath>
    <clipPath id="gridClip"><rect x="${gx}" y="${gy}" width="${gridW}" height="${7 * STEP - GAP}"/></clipPath>
    <style>
      .scan { animation: scan 9s cubic-bezier(.45,0,.25,1) infinite; }
      @keyframes scan { 0% { transform: translateX(-140px); } 70%, 100% { transform: translateX(${gridW + 20}px); } }
      @media (prefers-reduced-motion: reduce) { .scan { animation: none; opacity: 0; } }
    </style>
  </defs>
  <g clip-path="url(#card)">
    <rect width="${W}" height="${H}" fill="${C.obsidian900}"/>
    <rect width="${W}" height="${H}" fill="url(#surface)"/>
  </g>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="17.5" fill="none" stroke="#fff" stroke-opacity=".08"/>

  <text x="48" y="56" font-family="${SANS}" font-size="13" font-weight="500" fill="${C.ink500}" letter-spacing="2.6">ACTIVITÉ · 12 DERNIERS MOIS</text>
  <text x="${W - 48}" y="56" text-anchor="end" font-family="${MONO}" font-size="12" fill="${C.ink700}">mis à jour le ${esc(updated)}</text>
  ${statsSvg}

  <g font-family="${SANS}" font-size="12" fill="${C.ink500}">${months}</g>
  ${cells}
  <g clip-path="url(#gridClip)" style="mix-blend-mode:screen">
    <rect class="scan" x="${gx}" y="${gy}" width="120" height="${7 * STEP - GAP}" fill="url(#scan)"/>
  </g>

  <text x="48" y="${barY - 16}" font-family="${SANS}" font-size="13" font-weight="500" fill="${C.ink500}" letter-spacing="2.6">LANGAGES DES DÉPÔTS PUBLICS</text>
  <clipPath id="barClip"><rect x="${barX}" y="${barY}" width="${barW}" height="8" rx="4"/></clipPath>
  <g clip-path="url(#barClip)">${bar}</g>
  ${legend}
  <text x="${W - 48}" y="${H - 18}" text-anchor="end" font-family="${MONO}" font-size="11" fill="${C.ink700}">données : API GitHub · volume de code, hors forks</text>
</svg>
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, svg);
console.log(`✓ ${OUT} — ${cal.totalContributions} contributions, ${activeDays} jours actifs, plus longue série ${longest}, ${repoCount} dépôts, ${langs.length} langages`);
