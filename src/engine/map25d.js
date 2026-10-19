/**
 * MAPEX GIS 2.5D — Motor de Cartografia Fantástica & Worldbuilder Studio
 * Estilo de Arte: Hand-drawn Fantasy Cartography (Inkarnate / Wonderdraft / Tolkien / Arcadia)
 * 
 * Funcionalidades Avançadas:
 * - Pincel Hexagonal com cursor em hexágono (2px a 100px contínuos).
 * - Pincel de Reinos com preenchimento territorial hexagonal contínuo.
 * - Borracha cirúrgica que apaga apenas assets (montanhas, árvores, rios, cidades, reinos), PRESERVANDO a terra.
 * - Histórico Completo de Ações: Desfazer (Ctrl+Z) e Refazer (Ctrl+Y / Ctrl+Shift+Z).
 * - Área de Transferência Cartográfica: Copiar (Ctrl+C), Recortar (Ctrl+X), Colar (Ctrl+V) e Deletar (Del).
 * - Escala Dinâmica que se recalcula e redimensiona em tempo real com o Zoom (km e barra física).
 * - Sem Rosa dos Ventos fixa na origem do mapa.
 * - Relevo 2.5D com extrusão vertical de perspectiva reativa à inclinação da câmera.
 */

// ==========================================
// CONFIGURAÇÃO DAS 12 CAMADAS DO MUNDO
// ==========================================
const LAYER_CONFIG = [
  { key: 'ocean_landmask', label: '1. Costas, Textura & Ondas de Praia', active: true },
  { key: 'orography', label: '2. Montanhas 2.5D, Picos & Colinas', active: true },
  { key: 'biomes', label: '3. Florestas, Pinheiros & Carvalhos', active: true },
  { key: 'hydrography', label: '4. Rios Meandrosos & Deltas', active: true },
  { key: 'kingdoms', label: '5. Reinos & Territórios Hexagonais', active: true },
  { key: 'routes', label: '6. Rotas Comerciais & Trilhas', active: true },
  { key: 'resources', label: '7. Recursos Estratégicos & Minas', active: true },
  { key: 'settlements', label: '8. Cidades, Castelos & Portos', active: true },
  { key: 'climates', label: '9. Climas Köppen', active: false },
  { key: 'macrolanguages', label: '10. Macrolínguas (A a M)', active: false },
  { key: 'cultures', label: '11. Matrizes Culturais', active: false },
  { key: 'civilizations', label: '12. Civilizações Antigas', active: false }
];

// 4 Temas Visuais Cartográficos Ricos em Textura e Luminosidade
const THEMES = {
  midland: {
    name: 'The Midland Sea (Mike Schley / D&D 5e)',
    seaGradTop: '#3b6685',
    seaGradBot: '#1a374d',
    shallowWaterColor: 'rgba(96, 216, 226, 0.45)', // Halo turquesa vibrante de plataforma continental
    rippleColor: 'rgba(35, 24, 16, 0.42)', // Anéis de onda náutica em bico de pena
    beachColor: '#d8c59f',
    landFill: '#ebe2cc',
    landBorder: '#24180f',
    mountainSun: '#fdfcf9',
    mountainShadow: '#6e5e4e',
    mountainRidge: '#1e140d',
    treePine: '#1d4830',
    treeOak: '#386330',
    riverBedColor: 'rgba(25, 20, 15, 0.45)',
    riverColor: '#3ea6c6',
    borderOuter: '#221910',
    borderInner: '#d4a373'
  },
  vintage: {
    name: 'Pen & Ink Vintage (Sjötraktan / Carta Nórdica)',
    seaGradTop: '#e9dfcc',
    seaGradBot: '#d8ccb4',
    shallowWaterColor: 'rgba(182, 160, 130, 0.36)', // Halo de pergaminho náutico envelhecido
    rippleColor: 'rgba(44, 30, 20, 0.58)', // Linhas de onda em nanquim sépia
    beachColor: '#cbba94',
    landFill: '#f5eee2',
    landBorder: '#281a10',
    mountainSun: '#f9f6ee',
    mountainShadow: '#5c4a3d',
    mountainRidge: '#20150d',
    treePine: '#2a3b26',
    treeOak: '#3c4e34',
    riverBedColor: 'rgba(40, 26, 16, 0.5)',
    riverColor: '#5c7784',
    borderOuter: '#281a10',
    borderInner: '#a47e50'
  },
  arcadia: {
    name: 'Arcadia Dark Fantasy (Obsidiana, Ocre & Bronze)',
    seaGradTop: '#101a24',
    seaGradBot: '#070b10',
    shallowWaterColor: 'rgba(0, 245, 212, 0.28)', // Recifes bioluminescentes esmeralda/ciano
    rippleColor: 'rgba(212, 163, 115, 0.45)',
    beachColor: '#8a6840',
    landFill: '#1e2824',
    landBorder: '#101614',
    mountainSun: '#cbbda5',
    mountainShadow: '#2f2720',
    mountainRidge: '#0e0b08',
    treePine: '#12251a',
    treeOak: '#3e301d',
    riverBedColor: 'rgba(0, 0, 0, 0.65)',
    riverColor: '#00f5d4',
    borderOuter: '#12161c',
    borderInner: '#c4975a'
  },
  sapphire: {
    name: 'Sapphire Coast (Dividing Peaks)',
    seaGradTop: '#3b6b88',
    seaGradBot: '#214358',
    shallowWaterColor: 'rgba(110, 205, 220, 0.45)',
    rippleColor: 'rgba(30, 22, 16, 0.38)',
    beachColor: '#dfcfa8',
    landFill: '#7d9e68',
    landBorder: '#251b12',
    mountainSun: '#ffffff',
    mountainShadow: '#7a6c5c',
    mountainRidge: '#1b130c',
    treePine: '#183c27',
    treeOak: '#305826',
    riverBedColor: 'rgba(25, 20, 15, 0.45)',
    riverColor: '#5291b5',
    borderOuter: '#1e1610',
    borderInner: '#d4a373'
  }
};
THEMES.inkarnate = THEMES.vintage; // Alias retrocompatível

// Estado Global
let worldData = null;
let currentWorldId = 'kosmos_canonical';
let currentSelectedEra = null;
let studioActiveTool = 'select';
let brushRadius = 30; // 2px a 100px
let currentThemeKey = 'midland';
let mountainStyle = 'snow'; // 'snow', 'rocky', 'dark'
let forestType = 'pine'; // 'pine', 'oak', 'mixed'
let cityType = 'capital'; // 'capital', 'fortress', 'port', 'city'
let kingdomColor = '#e11d48';

// Câmera 2.5D
let panX = 0, panY = 0;
let camTilt = 0;
let camRot = 0;
let camZoom = 0.95;
let isPanning = false;
let startPanX = 0, startPanY = 0;

// Estado de Desenho Contínuo (Hexagonal Brushes)
let isDrawing = false;
let lastDrawX = 0, lastDrawY = 0;
let activeStrokePoints = [];
let currentMouseStagePos = [500, 350];

// Sistema de Histórico (Undo / Redo) e Clipboard
const historyStack = [];
const redoStack = [];
const MAX_HISTORY = 30;
let selectedFeature = null; // { layerKey, feat }
let clipboardFeature = null; // { layerKey, featData }

// Máscaras e Texturas Procedurais em Canvas Offscreen
let landMaskCanvas = null;
let landMaskCtx = null;
let parchmentPattern = null;
let oceanNoisePattern = null;

// ==========================================
// BANCO FONÉTICO DAS 13 FAMÍLIAS MACROLINGUÍSTICAS (A a M)
// ==========================================
const PHONOLOGY_TABLE = {
  K: { prefixes: ['Keth', 'Adar', 'Orak', 'Melk', 'Kadar', 'Zor', 'Khor'], suffixes: ['ash', 'or', 'eth', 'um', 'at', 'an'] },
  G: { prefixes: ['Pelag', 'Ghal', 'Var', 'Myrr', 'Dor', 'Coran', 'Syl'], suffixes: ['is', 'os', 'ia', 'on', 'en', 'ar'] },
  E: { prefixes: ['Sylv', 'Eldar', 'Arvel', 'Thas', 'Lórien', 'Nim', 'Fael'], suffixes: ['and', 'ia', 'or', 'eth', 'ien', 'ael'] },
  J: { prefixes: ['Jald', 'Vark', 'Hark', 'Korm', 'Borg', 'Drung', 'Tark'], suffixes: ['ur', 'as', 'ash', 'um', 'ok', 'ar'] },
  C: { prefixes: ['Cal', 'Thal', 'Mer', 'Pel', 'Sol', 'Cari', 'Vea'], suffixes: ['sur', 'mar', 'ina', 'dor', 'al', 'os'] },
  A: { prefixes: ['Ash', 'Akkad', 'Assur', 'Elam', 'Nabon', 'Ur', 'Sargon'], suffixes: ['ur', 'on', 'adon', 'am', 'ia', 'esh'] },
  H: { prefixes: ['Hesper', 'Vail', 'Mor', 'Hal', 'Crest', 'Dun', 'Garth'], suffixes: ['ford', 'port', 'ton', 'haven', 'shire', 'low'] },
  I: { prefixes: ['Frost', 'Is', 'Nifl', 'Kald', 'Skag', 'Thrym', 'Vind'], suffixes: ['heim', 'gard', 'fjell', 'vik', 'thor', 'mark'] },
  F: { prefixes: ['Flor', 'Far', 'Gond', 'Fen', 'Val', 'Austr', 'Mear'], suffixes: ['al', 'or', 'as', 'on', 'ien', 'ia'] },
  D: { prefixes: ['Drak', 'Dorn', 'Darn', 'Krag', 'Bar', 'Tor', 'Garn'], suffixes: ['an', 'okh', 'dor', 'as', 'or', 'ath'] },
  B: { prefixes: ['Balan', 'Bor', 'Breg', 'Bel', 'Baras', 'Brand'], suffixes: ['or', 'is', 'a', 'eth', 'um'] },
  L: { prefixes: ['Lug', 'Dan', 'Mesk', 'Ur', 'Nip', 'Kish', 'Larsa'], suffixes: ['an', 'al', 'ur', 'esh', 'im', 'or'] },
  M: { prefixes: ['Mahr', 'Mor', 'Mal', 'Mur', 'Mok', 'Min'], suffixes: ['is', 'an', 'at', 'or', 'en'] }
};

function generateToponym(family = 'K') {
  const famKey = PHONOLOGY_TABLE[family] ? family : 'K';
  const data = PHONOLOGY_TABLE[famKey];
  const pre = data.prefixes[Math.floor(Math.random() * data.prefixes.length)];
  const suf = data.suffixes[Math.floor(Math.random() * data.suffixes.length)];
  return `${pre}-${suf.charAt(0).toUpperCase() + suf.slice(1)}`;
}

// ==========================================
// FUNÇÕES DE GEOMETRIA HEXAGONAL
// ==========================================
function getHexagonPoints(cx, cy, radius) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - (Math.PI / 6); // Hexágono de ponta superior
    pts.push([
      Math.round(cx + Math.cos(angle) * radius),
      Math.round(cy + Math.sin(angle) * radius)
    ]);
  }
  return pts;
}

function drawHexagonPath(ctx, cx, cy, radius) {
  const pts = getHexagonPoints(cx, cy, radius);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < 6; i++) {
    ctx.lineTo(pts[i][0], pts[i][1]);
  }
  ctx.closePath();
}

function isPointInHexagon(px, py, cx, cy, radius) {
  const dx = Math.abs(px - cx);
  const dy = Math.abs(py - cy);
  const h = radius * 0.8660254; // sqrt(3)/2
  if (dx > radius || dy > h) return false;
  return (radius * 2 - dx) * h >= 2 * radius * dy;
}

// ==========================================
// MOTOR DE RUÍDO PROCEDURAL 2D & SUAVIZAÇÃO FRACTAL
// ==========================================
const NOISE_PERM = new Uint8Array(512);
const NOISE_P = [
  151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,
  8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,
  35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,
  134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,
  55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,
  18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,
  250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,
  189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,
  172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,
  228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,
  107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,
  138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
];
for (let i = 0; i < 256; i++) {
  NOISE_PERM[i] = NOISE_P[i];
  NOISE_PERM[256 + i] = NOISE_P[i];
}

const GRAD2 = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1]
];

function noise2D(x, y) {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);

  // Curva de interpolação s-curve de Perlin: 6t^5 - 15t^4 + 10t^3
  const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
  const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);

  const A = NOISE_PERM[X] + Y;
  const B = NOISE_PERM[X + 1] + Y;

  const g00 = GRAD2[NOISE_PERM[A] & 7];
  const g10 = GRAD2[NOISE_PERM[B] & 7];
  const g01 = GRAD2[NOISE_PERM[A + 1] & 7];
  const g11 = GRAD2[NOISE_PERM[B + 1] & 7];

  const dot00 = g00[0] * xf + g00[1] * yf;
  const dot10 = g10[0] * (xf - 1) + g10[1] * yf;
  const dot01 = g01[0] * xf + g01[1] * (yf - 1);
  const dot11 = g11[0] * (xf - 1) + g11[1] * (yf - 1);

  const nx0 = dot00 * (1 - u) + dot10 * u;
  const nx1 = dot01 * (1 - u) + dot11 * u;
  return nx0 * (1 - v) + nx1 * v;
}

function fbm2D(x, y, octaves = 3, lacunarity = 2.0, gain = 0.5) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < octaves; i++) {
    sum += noise2D(x * freq, y * freq) * amp;
    freq *= lacunarity;
    amp *= gain;
  }
  return sum;
}

// Algoritmo de Suavização Morfológica por Chaikin
function chaikinSmooth(pts, iterations = 2, closed = true) {
  if (!pts || pts.length < 3) return pts ? [...pts] : [];
  let current = pts.map(p => [p[0], p[1]]);

  for (let iter = 0; iter < iterations; iter++) {
    const next = [];
    const len = current.length;
    const numSegments = closed ? len : len - 1;

    for (let i = 0; i < numSegments; i++) {
      const p0 = current[i];
      const p1 = current[(i + 1) % len];

      // Q = 0.75 * P0 + 0.25 * P1
      const qx = Math.round(0.75 * p0[0] + 0.25 * p1[0]);
      const qy = Math.round(0.75 * p0[1] + 0.25 * p1[1]);
      // R = 0.25 * P0 + 0.75 * P1
      const rx = Math.round(0.25 * p0[0] + 0.75 * p1[0]);
      const ry = Math.round(0.25 * p0[1] + 0.75 * p1[1]);

      next.push([qx, qy]);
      next.push([rx, ry]);
    }
    if (!closed) {
      next.unshift(current[0]);
      next.push(current[current.length - 1]);
    }
    current = next;
  }
  return current;
}

// Interpolação Catmull-Rom Spline para Rios Orgânicos
function getCatmullRomSpline(points, numSamples = 16) {
  if (!points || points.length < 2) return points ? [...points] : [];
  if (points.length === 2) {
    const res = [];
    for (let i = 0; i <= numSamples; i++) {
      const t = i / numSamples;
      res.push([
        points[0][0] * (1 - t) + points[1][0] * t,
        points[0][1] * (1 - t) + points[1][1] * t
      ]);
    }
    return res;
  }

  const result = [];
  const p = [points[0], ...points, points[points.length - 1]];

  for (let i = 1; i < p.length - 2; i++) {
    const p0 = p[i - 1];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2];

    for (let step = 0; step < numSamples; step++) {
      const t = step / numSamples;
      const t2 = t * t;
      const t3 = t2 * t;

      const f1 = -0.5 * t3 + t2 - 0.5 * t;
      const f2 = 1.5 * t3 - 2.5 * t2 + 1.0;
      const f3 = -1.5 * t3 + 2.0 * t2 + 0.5 * t;
      const f4 = 0.5 * t3 - 0.5 * t2;

      const x = p0[0] * f1 + p1[0] * f2 + p2[0] * f3 + p3[0] * f4;
      const y = p0[1] * f1 + p1[1] * f2 + p2[1] * f3 + p3[1] * f4;
      result.push([Math.round(x), Math.round(y)]);
    }
  }
  result.push(points[points.length - 1]);
  return result;
}

// ==========================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ==========================================
async function initMapex() {
  initLandMaskCanvas();
  generateProceduralTextures();
  bindStartScreen();
  bindDrawers();
  bindCameraControls();
  bindStudioToolbar();
  bindFeatureEditor();
  bindTimeline();
  bindKeyboardShortcuts();
  loadSavedMapsList();

  const lastActive = localStorage.getItem('mapex_active_world_id');
  if (lastActive && lastActive !== 'null') {
    await loadWorldById(lastActive);
  } else {
    showStartScreen();
  }
}

function initLandMaskCanvas() {
  landMaskCanvas = document.createElement('canvas');
  landMaskCanvas.width = 1000;
  landMaskCanvas.height = 700;
  landMaskCtx = landMaskCanvas.getContext('2d');
}

function generateProceduralTextures() {
  // 1. Textura de Pergaminho e Fibras
  const pCan = document.createElement('canvas');
  pCan.width = 120; pCan.height = 120;
  const pCtx = pCan.getContext('2d');
  pCtx.fillStyle = '#f8f4eb';
  pCtx.fillRect(0, 0, 120, 120);

  pCtx.fillStyle = 'rgba(120, 95, 60, 0.05)';
  for (let i = 0; i < 90; i++) {
    pCtx.fillRect(Math.random() * 120, Math.random() * 120, 2 + Math.random() * 4, 1.5);
  }
  pCtx.fillStyle = 'rgba(70, 50, 30, 0.035)';
  for (let i = 0; i < 50; i++) {
    pCtx.beginPath();
    pCtx.arc(Math.random() * 120, Math.random() * 120, Math.random() * 8, 0, Math.PI * 2);
    pCtx.fill();
  }
  parchmentPattern = pCtx.createPattern(pCan, 'repeat');

  // 2. Textura de Ondulações Oceânicas
  const oCan = document.createElement('canvas');
  oCan.width = 80; oCan.height = 80;
  const oCtx = oCan.getContext('2d');
  oCtx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  oCtx.lineWidth = 1.2;
  for (let y = 15; y < 80; y += 24) {
    oCtx.beginPath();
    oCtx.arc(20, y, 12, Math.PI * 1.1, Math.PI * 1.9);
    oCtx.stroke();
    oCtx.beginPath();
    oCtx.arc(60, y + 10, 12, Math.PI * 1.1, Math.PI * 1.9);
    oCtx.stroke();
  }
  oceanNoisePattern = oCtx.createPattern(oCan, 'repeat');
}

// ==========================================
// 1. GERENCIADOR DE MAPAS & DASHBOARD INICIAL
// ==========================================
function showStartScreen() {
  document.getElementById('startScreen')?.classList.remove('hidden');
  document.getElementById('editorScreen')?.classList.add('hidden');
  loadSavedMapsList();
}

function showEditorScreen() {
  document.getElementById('startScreen')?.classList.add('hidden');
  document.getElementById('editorScreen')?.classList.remove('hidden');
  buildLayerMenu();
  updateCameraTransform();
  renderScene();
}

function bindStartScreen() {
  document.getElementById('btnTplEmpty')?.addEventListener('click', () => {
    createEmptyWorld();
    showEditorScreen();
  });

  document.getElementById('btnTplContinent')?.addEventListener('click', () => {
    createProceduralContinent();
    showEditorScreen();
  });

  document.getElementById('btnTplArchipelago')?.addEventListener('click', () => {
    createProceduralArchipelago();
    showEditorScreen();
  });

  document.getElementById('btnTplKosmos')?.addEventListener('click', async () => {
    await loadKosmosCanonical();
    showEditorScreen();
  });

  const btnImport = document.getElementById('btnTplImport');
  const inputImport = document.getElementById('startImportInput');
  btnImport?.addEventListener('click', () => inputImport?.click());
  inputImport?.addEventListener('change', handleImportJson);

  document.getElementById('btnHomeFromEditor')?.addEventListener('click', showStartScreen);
  document.getElementById('btnBackToDashboard')?.addEventListener('click', showStartScreen);
}

function loadSavedMapsList() {
  const container = document.getElementById('savedMapsContainer');
  if (!container) return;
  container.innerHTML = '';

  let savedList = [];
  try {
    const raw = localStorage.getItem('mapex_worlds_catalog');
    if (raw) savedList = JSON.parse(raw);
  } catch (e) { savedList = []; }

  if (!savedList.find(m => m.id === 'kosmos_canonical')) {
    savedList.unshift({
      id: 'kosmos_canonical',
      name: 'Kosmos Canônico (Cartas Oficiais)',
      settlementCount: 16,
      updatedAt: new Date().toISOString()
    });
  }

  savedList.forEach(mapItem => {
    const card = document.createElement('div');
    card.className = 'saved-map-card';
    const d = new Date(mapItem.updatedAt || Date.now());
    const dateFormatted = d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    card.innerHTML = `
      <div class="saved-map-header">
        <div class="saved-map-title">${mapItem.name}</div>
        <span class="badge">${mapItem.settlementCount || 0} cidades</span>
      </div>
      <div class="saved-map-meta">
        <span>🕒 ${dateFormatted}</span>
        <span>ID: ${mapItem.id}</span>
      </div>
      <div class="saved-map-actions">
        <button class="btn btn-secondary" style="flex:1" data-load-id="${mapItem.id}">📂 Abrir Mapa</button>
        ${mapItem.id !== 'kosmos_canonical' ? `<button class="btn btn-danger" style="padding:6px 10px" data-del-id="${mapItem.id}">🗑️</button>` : ''}
      </div>
    `;

    card.querySelector(`[data-load-id="${mapItem.id}"]`)?.addEventListener('click', () => {
      loadWorldById(mapItem.id);
    });

    if (mapItem.id !== 'kosmos_canonical') {
      card.querySelector(`[data-del-id="${mapItem.id}"]`)?.addEventListener('click', () => {
        if (confirm(`Deseja excluir o mapa "${mapItem.name}"?`)) {
          deleteWorldById(mapItem.id);
        }
      });
    }

    container.appendChild(card);
  });
}

function saveWorldCatalogEntry(world) {
  let catalog = [];
  try { catalog = JSON.parse(localStorage.getItem('mapex_worlds_catalog') || '[]'); } catch (e) { catalog = []; }
  const index = catalog.findIndex(m => m.id === world.metadata.id);
  const entry = {
    id: world.metadata.id,
    name: world.metadata.name || 'Novo Mundo',
    settlementCount: (world.layers.settlements || []).length,
    updatedAt: new Date().toISOString()
  };
  if (index >= 0) catalog[index] = entry;
  else catalog.push(entry);
  localStorage.setItem('mapex_worlds_catalog', JSON.stringify(catalog));
}

function deleteWorldById(worldId) {
  let catalog = [];
  try { catalog = JSON.parse(localStorage.getItem('mapex_worlds_catalog') || '[]'); } catch (e) {}
  catalog = catalog.filter(m => m.id !== worldId);
  localStorage.setItem('mapex_worlds_catalog', JSON.stringify(catalog));
  localStorage.removeItem(`mapex_world_${worldId}`);
  loadSavedMapsList();
  showToast('Mapa excluído com sucesso.', 'info');
}

async function loadWorldById(worldId) {
  if (worldId === 'kosmos_canonical') {
    await loadKosmosCanonical();
  } else {
    const raw = localStorage.getItem(`mapex_world_${worldId}`);
    if (raw) {
      try {
        worldData = JSON.parse(raw);
        currentWorldId = worldId;
      } catch (e) {
        await loadKosmosCanonical();
      }
    } else {
      await loadKosmosCanonical();
    }
  }
  localStorage.setItem('mapex_active_world_id', worldId);
  rasterizeWorldLandmask();
  showEditorScreen();
  showToast(`Mundo "${worldData.metadata?.name || 'Mapex'}" pronto!`, 'success');
}

// ==========================================
// 2. CRIAÇÃO DE MODELOS (TEMPLATES)
// ==========================================
function createEmptyWorld(name = 'Oceano Desconhecido') {
  currentWorldId = 'world_' + Date.now();
  worldData = {
    metadata: {
      id: currentWorldId,
      name: name,
      canvasWidth: 1000,
      canvasHeight: 700,
      scaleKmPerUnit: 250,
      created_at: new Date().toISOString()
    },
    layers: {
      ocean_landmask: [],
      orography: [],
      biomes: [],
      hydrography: [],
      settlements: [],
      kingdoms: [],
      routes: [],
      resources: [],
      climates: [],
      macrolanguages: [],
      cultures: [],
      civilizations: []
    }
  };
  landMaskCtx.clearRect(0, 0, 1000, 700);
  saveWorldLocally();
  showToast('Oceano Vazio criado! Use o pincel de Terra para erguer continentes.', 'info');
}

function createProceduralContinent(name = 'Reinos Centrais de Arcadia') {
  createEmptyWorld(name);

  const cx = 500, cy = 350;
  const numVerts = 48;
  const rawPts = [];
  for (let i = 0; i < numVerts; i++) {
    const angle = (i / numVerts) * Math.PI * 2;
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    const noiseVal = fbm2D(nx * 1.6 + 5.2, ny * 1.6 + 3.1, 4);
    const r = 265 + noiseVal * 95;
    rawPts.push([Math.round(cx + nx * r), Math.round(cy + ny * r)]);
  }
  const pts = chaikinSmooth(rawPts, 2, true);

  worldData.layers.ocean_landmask.push({
    id: 'main_land',
    name: 'Continente Central',
    type: 'continent',
    polygon: pts
  });

  const mountainPeaks = [];
  for (let y = 160; y <= 540; y += 22) {
    const x = 500 + Math.sin(y * 0.02) * 45 + (Math.random() * 20 - 10);
    mountainPeaks.push({
      id: `mnt_${y}`,
      x: Math.round(x),
      y: y,
      size: 28 + Math.floor(Math.random() * 12),
      style: y < 240 ? 'snow' : 'rocky'
    });
  }
  worldData.layers.orography = mountainPeaks;

  const trees = [];
  for (let i = 0; i < 45; i++) {
    trees.push({
      id: `tree_w_${i}`,
      x: Math.round(330 + Math.random() * 110),
      y: Math.round(240 + Math.random() * 220),
      size: 16 + Math.floor(Math.random() * 8),
      type: Math.random() > 0.4 ? 'pine' : 'oak'
    });
  }
  for (let i = 0; i < 35; i++) {
    trees.push({
      id: `tree_e_${i}`,
      x: Math.round(590 + Math.random() * 120),
      y: Math.round(280 + Math.random() * 200),
      size: 16 + Math.floor(Math.random() * 8),
      type: 'oak'
    });
  }
  worldData.layers.biomes = trees;

  worldData.layers.hydrography.push({
    id: 'river_west',
    name: 'Rio da Prata',
    flow: 'high',
    points: [[485, 310], [420, 330], [350, 320], [280, 360], [230, 380]]
  });
  worldData.layers.hydrography.push({
    id: 'river_east',
    name: 'Rio das Serpentes',
    flow: 'high',
    points: [[520, 380], [580, 420], [640, 450], [710, 460], [760, 490]]
  });

  worldData.layers.kingdoms = [
    {
      id: 'kng_1',
      name: 'Império Ocidental de Valíria',
      color: '#eab308',
      center: [380, 310],
      cells: [[380, 310, 50], [340, 310, 45], [410, 330, 45], [360, 270, 45]]
    },
    {
      id: 'kng_2',
      name: 'Soberania Oriental de Gorvash',
      color: '#e11d48',
      center: [630, 390],
      cells: [[630, 390, 50], [670, 380, 45], [600, 420, 45], [640, 440, 45]]
    }
  ];

  worldData.layers.settlements = [
    { id: 'city_cap', name: 'Valíria Imperial', type: 'capital', lang_family: 'K', era: 'Era II', coords: [480, 240], population: 85000, lore: 'A gloriosa metrópole sob as sombras das cordilheiras nevadas.' },
    { id: 'city_port_w', name: 'Porto Esmeralda', type: 'port', lang_family: 'G', era: 'Era II', coords: [230, 385], population: 38000, lore: 'Empório comercial ocidental com estaleiros de caravelas.' },
    { id: 'city_fort_e', name: 'Bastião do Ferro', type: 'fortress', lang_family: 'J', era: 'Era III', coords: [515, 380], population: 19000, lore: 'Guardião pétreo do único desfiladeiro de travessia.' },
    { id: 'city_port_e', name: 'Pelag-Ghol', type: 'city', lang_family: 'C', era: 'Era II', coords: [750, 485], population: 44000, lore: 'Metrópole mercantil das baías orientais.' }
  ];

  rasterizeWorldLandmask();
  saveWorldLocally();
  showToast('Continente Central gerado com sucesso!', 'success');
}

function createProceduralArchipelago(name = 'Arquipélago das Mil Ilhas') {
  createEmptyWorld(name);

  const islands = [];
  for (let i = 0; i < 16; i++) {
    const cx = 160 + Math.random() * 680;
    const cy = 130 + Math.random() * 440;
    const rad = 25 + Math.random() * 55;
    const rawPts = [];
    const numVerts = 20;
    for (let j = 0; j < numVerts; j++) {
      const angle = (j / numVerts) * Math.PI * 2;
      const nx = Math.cos(angle);
      const ny = Math.sin(angle);
      const p = fbm2D((cx + nx * rad) * 0.04, (cy + ny * rad) * 0.04, 3) * 0.35;
      const r = rad * (1 + p);
      rawPts.push([Math.round(cx + nx * r), Math.round(cy + ny * r)]);
    }
    const pts = chaikinSmooth(rawPts, 2, true);
    islands.push({
      id: `island_${i + 1}`,
      name: `Ilha ${generateToponym('G')}`,
      type: 'island',
      polygon: pts
    });
  }
  worldData.layers.ocean_landmask = islands;

  worldData.layers.settlements = [
    { id: 'port_1', name: 'Ghal-Is', type: 'capital', lang_family: 'G', era: 'Era II', coords: [islands[0].polygon[0][0], islands[0].polygon[0][1]], population: 35000, lore: 'Capital insular das frotas de alto-mar.' },
    { id: 'port_2', name: 'Pelag-Sur', type: 'port', lang_family: 'G', era: 'Era II', coords: [islands[1].polygon[0][0], islands[1].polygon[0][1]], population: 24000, lore: 'Porto fortificado com farol de bronze ancestral.' }
  ];

  rasterizeWorldLandmask();
  saveWorldLocally();
  showToast('Arquipélago gerado com sucesso!', 'success');
}

async function loadKosmosCanonical() {
  currentWorldId = 'kosmos_canonical';
  try {
    const res = await fetch('src/data/world_layers.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    worldData = await res.json();
  } catch (err) {
    if (window.MAPEX_DEFAULT_DATA) {
      worldData = JSON.parse(JSON.stringify(window.MAPEX_DEFAULT_DATA));
    } else {
      createProceduralContinent('Kosmos Fallback');
      return;
    }
  }

  convertOrographyLinesToPeaks();
  convertBiomesToTreeClusters();

  worldData.metadata.id = 'kosmos_canonical';
  rasterizeWorldLandmask();
  saveWorldLocally();
}

function convertOrographyLinesToPeaks() {
  if (!worldData.layers.orography) return;
  const hasOnlyLines = worldData.layers.orography.some(m => Array.isArray(m.points));
  if (!hasOnlyLines) return;

  const peaks = [];
  worldData.layers.orography.forEach(m => {
    if (m.points && m.points.length >= 2) {
      for (let i = 0; i < m.points.length - 1; i++) {
        const p1 = m.points[i];
        const p2 = m.points[i + 1];
        const dist = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
        const steps = Math.max(1, Math.floor(dist / 22));
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const x = Math.round(p1[0] + (p2[0] - p1[0]) * t);
          const y = Math.round(p1[1] + (p2[1] - p1[1]) * t);
          peaks.push({
            id: `peak_${peaks.length + 1}`,
            x: x,
            y: y,
            size: 26 + (Math.sin(s) * 8),
            style: y < 350 ? 'snow' : 'rocky'
          });
        }
      }
    } else if (m.x && m.y) {
      peaks.push(m);
    }
  });
  worldData.layers.orography = peaks;
}

function convertBiomesToTreeClusters() {
  if (!worldData.layers.biomes) return;
  const hasPolys = worldData.layers.biomes.some(b => Array.isArray(b.polygon));
  if (!hasPolys) return;

  const trees = [];
  worldData.layers.biomes.forEach(b => {
    if (b.polygon && b.polygon.length >= 3) {
      const minX = Math.min(...b.polygon.map(p => p[0]));
      const maxX = Math.max(...b.polygon.map(p => p[0]));
      const minY = Math.min(...b.polygon.map(p => p[1]));
      const maxY = Math.max(...b.polygon.map(p => p[1]));

      for (let i = 0; i < 28; i++) {
        const x = Math.round(minX + Math.random() * (maxX - minX));
        const y = Math.round(minY + Math.random() * (maxY - minY));
        trees.push({
          id: `tree_${trees.length + 1}`,
          x: x,
          y: y,
          size: 16 + Math.floor(Math.random() * 8),
          type: b.type === 'tundra' ? 'pine' : 'oak'
        });
      }
    } else if (b.x && b.y) {
      trees.push(b);
    }
  });
  worldData.layers.biomes = trees;
}

function rasterizeWorldLandmask() {
  if (!landMaskCtx || !worldData) return;
  landMaskCtx.clearRect(0, 0, 1000, 700);

  (worldData.layers.ocean_landmask || []).forEach(geo => {
    if (!geo.polygon || geo.polygon.length < 3) return;
    const smoothPts = chaikinSmooth(geo.polygon, 2, true);
    landMaskCtx.beginPath();
    landMaskCtx.moveTo(smoothPts[0][0], smoothPts[0][1]);
    for (let i = 1; i < smoothPts.length; i++) {
      landMaskCtx.lineTo(smoothPts[i][0], smoothPts[i][1]);
    }
    landMaskCtx.closePath();

    if (geo.type === 'inland_sea') {
      landMaskCtx.globalCompositeOperation = 'destination-out';
      landMaskCtx.fill();
      landMaskCtx.globalCompositeOperation = 'source-over';
    } else {
      landMaskCtx.fillStyle = '#ffffff';
      landMaskCtx.fill();
    }
  });
}

// ==========================================
// 3. PERSISTÊNCIA & SINCRONIZAÇÃO
// ==========================================
function saveWorldLocally() {
  if (!worldData) return;
  try {
    localStorage.setItem(`mapex_world_${worldData.metadata.id}`, JSON.stringify(worldData));
    saveWorldCatalogEntry(worldData);
  } catch (e) {
    console.warn('LocalStorage limit:', e);
  }
}

async function saveWorldDataToServer() {
  if (!worldData) return;
  saveWorldLocally();

  try {
    const res = await fetch('/api/layers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(worldData)
    });
    const result = await res.json();
    if (result.ok) {
      showToast(`Mundo salvo no disco! Snapshot: ${result.snapshot}`, 'success');
    } else {
      showToast('Salvo localmente no navegador (LocalStorage).', 'info');
    }
  } catch (err) {
    showToast('Salvo localmente no navegador (Modo Offline).', 'info');
  }
}

function handleImportJson(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const parsed = JSON.parse(evt.target.result);
      if (!parsed.layers) throw new Error('Formato inválido: objeto "layers" ausente.');
      parsed.metadata = parsed.metadata || {};
      parsed.metadata.id = 'imported_' + Date.now();
      parsed.metadata.name = parsed.metadata.name || file.name.replace('.json', '');
      worldData = parsed;
      currentWorldId = parsed.metadata.id;
      convertOrographyLinesToPeaks();
      convertBiomesToTreeClusters();
      rasterizeWorldLandmask();
      saveWorldLocally();
      showEditorScreen();
      showToast(`Mapa "${parsed.metadata.name}" importado com sucesso!`, 'success');
    } catch (err) {
      showToast('Erro ao importar JSON: ' + err.message, 'danger');
    }
  };
  reader.readAsText(file);
}

// ==========================================
// 4. MOTOR DE RENDERIZAÇÃO ESTILO WONDERDRAFT / INKARNATE
// ==========================================
function renderScene() {
  const canvas = document.getElementById('terrainCanvas');
  const reliefCanvas = document.getElementById('reliefCanvas');
  if (!canvas || !reliefCanvas || !worldData) return;

  const ctx = canvas.getContext('2d');
  const rCtx = reliefCanvas.getContext('2d');
  const theme = THEMES[currentThemeKey] || THEMES.midland;

  ctx.clearRect(0, 0, 1000, 700);
  rCtx.clearRect(0, 0, 1000, 700);

  // A) OCEANO COM TEXTURA & GRADIENTE DE PROFUNDIDADE
  const oceanGrad = ctx.createRadialGradient(500, 350, 80, 500, 350, 620);
  oceanGrad.addColorStop(0, theme.seaGradTop);
  oceanGrad.addColorStop(1, theme.seaGradBot);
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, 1000, 700);

  if (oceanNoisePattern) {
    ctx.fillStyle = oceanNoisePattern;
    ctx.fillRect(0, 0, 1000, 700);
  }

  // Linhas de rumo marítimas
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let x = 125; x < 1000; x += 150) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 700); ctx.stroke();
  }
  for (let y = 100; y < 700; y += 150) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1000, y); ctx.stroke();
  }

  // B) ONDULAÇÕES CONCÊNTRICAS DE PRAIA, HALO TURQUESA & TERRA TEXTURIZADA
  if (isLayerActive('ocean_landmask') && landMaskCanvas) {
    renderCoastalWaterAndLand(ctx, theme);
  }

  // C) TERRITÓRIOS DE REINOS PINTADOS COM PINCEL HEXAGONAL
  if (isLayerActive('kingdoms')) {
    renderKingdomTerritories(ctx);
  }

  // D) RIOS MEANDROSOS COM SPLINES & GRADIENTE DE LARGURA
  if (isLayerActive('hydrography')) {
    renderRivers(ctx, theme);
  }

  // E) ROTAS COMERCIAIS
  if (isLayerActive('routes')) {
    renderTradeRoutes(ctx);
  }

  // F) RELEVO 2.5D ELEVADO: MONTANHAS, COLINAS E ÁRVORES (NO RELIEF CANVAS)
  renderIsometricTerrain(rCtx, theme);

  // G) MOLDURA CARTOGRÁFICA CLÁSSICA COM RÉGUA GRADUADA
  drawCartographicBorder(ctx, theme);

  // H) OVERLAY SVG (CIDADES, FITAS HERÁLDICAS E RÓTULOS ARQUEADOS)
  renderInteractiveOverlay(theme);

  // I) ATUALIZA ESCALA DINÂMICA
  updateDynamicScale();
}

// PIPELINE DE RENDERIZAÇÃO COSTEIRA LIVRE DE BRANCO PURO (PILAR 2)
function renderCoastalWaterAndLand(ctx, theme) {
  if (!landMaskCanvas) return;

  // 1. HALO DE ÁGUAS RASAS & PLATAFORMA CONTINENTAL TURQUESA
  // O truque de sombra deslocada (shadowOffsetX = 3000) desenha APENAS a sombra sem sujar com a máscara branca
  ctx.save();
  ctx.shadowColor = theme.shallowWaterColor || 'rgba(96, 216, 226, 0.45)';
  ctx.shadowBlur = 32;
  ctx.shadowOffsetX = 3000;
  ctx.shadowOffsetY = 0;
  ctx.drawImage(landMaskCanvas, -3000, 0);
  ctx.restore();

  // Segunda passagem de halo mais concentrada (14px) para transição de recife vibrante
  ctx.save();
  ctx.shadowColor = theme.shallowWaterColor || 'rgba(96, 216, 226, 0.45)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetX = 3000;
  ctx.shadowOffsetY = 0;
  ctx.drawImage(landMaskCanvas, -3000, 0);
  ctx.restore();

  // 2. LINHAS DE ONDAS NÁUTICAS CONCÊNTRICAS (Shoreline Ripples)
  // 4 anéis náuticos finos de bico de pena concêntricos à costa com opacidade decrescente
  const ripples = [
    { blur: 4, alpha: 0.55 },
    { blur: 9, alpha: 0.35 },
    { blur: 16, alpha: 0.20 },
    { blur: 24, alpha: 0.10 }
  ];

  ripples.forEach(r => {
    ctx.save();
    ctx.globalAlpha = r.alpha;
    ctx.shadowColor = theme.rippleColor || 'rgba(35, 24, 16, 0.42)';
    ctx.shadowBlur = r.blur;
    ctx.shadowOffsetX = 3000;
    ctx.drawImage(landMaskCanvas, -3000, 0);
    ctx.restore();
  });

  // 3. PREENCHIMENTO DE TERRA TEXTURIZADA (MASCARADA RIGOROSAMENTE NA LAND MASK)
  ctx.save();
  const landFillCanvas = document.createElement('canvas');
  landFillCanvas.width = 1000;
  landFillCanvas.height = 700;
  const lCtx = landFillCanvas.getContext('2d');

  lCtx.drawImage(landMaskCanvas, 0, 0);
  // source-in garante que qualquer cor ou textura desenhada fique restrita ao interior da terra
  lCtx.globalCompositeOperation = 'source-in';
  lCtx.fillStyle = theme.landFill;
  lCtx.fillRect(0, 0, 1000, 700);

  // Textura rica de pergaminho vegetal
  if (parchmentPattern) {
    lCtx.globalAlpha = 0.65;
    lCtx.fillStyle = parchmentPattern;
    lCtx.fillRect(0, 0, 1000, 700);
    lCtx.globalAlpha = 1.0;
  }

  // Gradiente ecológico sutil do relevo
  const ecoGrad = lCtx.createRadialGradient(500, 350, 60, 500, 350, 480);
  ecoGrad.addColorStop(0, 'rgba(0, 0, 0, 0.0)');
  ecoGrad.addColorStop(1, 'rgba(0, 0, 0, 0.08)');
  lCtx.fillStyle = ecoGrad;
  lCtx.fillRect(0, 0, 1000, 700);

  // Aplica terra colorida ao canvas principal
  ctx.drawImage(landFillCanvas, 0, 0);

  // 4. LINHA DE CONTORNO COSTEIRO (Bico de pena sépia)
  ctx.shadowColor = theme.landBorder;
  ctx.shadowBlur = 1.8;
  ctx.shadowOffsetX = 3000;
  ctx.drawImage(landMaskCanvas, -3000, 0);
  ctx.restore();
}

// Renderiza Reinos com Territórios Pintados por Pincel Hexagonal
function renderKingdomTerritories(ctx) {
  (worldData.layers.kingdoms || []).forEach(kng => {
    if (!kng.cells || kng.cells.length === 0) {
      if (kng.center) {
        kng.cells = [[kng.center[0], kng.center[1], 45]];
      } else return;
    }

    ctx.save();
    ctx.fillStyle = kng.color || '#e11d48';
    ctx.globalAlpha = 0.28;

    // Preenche cada célula hexagonal pintada do reino
    kng.cells.forEach(([cx, cy, r]) => {
      drawHexagonPath(ctx, cx, cy, r);
      ctx.fill();
    });

    // Borda heráldica tracejada em volta das células
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = kng.color || '#e11d48';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([6, 4]);
    kng.cells.forEach(([cx, cy, r]) => {
      drawHexagonPath(ctx, cx, cy, r);
      ctx.stroke();
    });
    ctx.restore();
  });
}

// PILAR 5: RIOS REALISTAS COM CATMULL-ROM SPLINE & GRADIENTE DE LARGURA
function renderRivers(ctx, theme) {
  (worldData.layers.hydrography || []).forEach(r => {
    if (!r.points || r.points.length < 2) return;

    const splinePts = getCatmullRomSpline(r.points, 14);
    if (splinePts.length < 2) return;

    const baseWidth = r.flow === 'high' ? 4.5 : 2.8;
    const minWidth = 0.9;

    // Passagem 1: Leito / Margem Escura do Rio
    for (let i = 0; i < splinePts.length - 1; i++) {
      const t = i / (splinePts.length - 1);
      const w = minWidth + (baseWidth - minWidth) * Math.pow(t, 1.35);
      ctx.beginPath();
      ctx.moveTo(splinePts[i][0], splinePts[i][1]);
      ctx.lineTo(splinePts[i + 1][0], splinePts[i + 1][1]);
      ctx.strokeStyle = theme.riverBedColor || 'rgba(25, 20, 15, 0.45)';
      ctx.lineWidth = w + 1.4;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Passagem 2: Correnteza D'água Límpida
    for (let i = 0; i < splinePts.length - 1; i++) {
      const t = i / (splinePts.length - 1);
      const w = minWidth + (baseWidth - minWidth) * Math.pow(t, 1.35);
      ctx.beginPath();
      ctx.moveTo(splinePts[i][0], splinePts[i][1]);
      ctx.lineTo(splinePts[i + 1][0], splinePts[i + 1][1]);
      ctx.strokeStyle = theme.riverColor;
      ctx.lineWidth = w;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Abertura de estuário / delta na foz
    if (splinePts.length >= 4) {
      const lastP = splinePts[splinePts.length - 1];
      const prevP = splinePts[splinePts.length - 3];
      const angle = Math.atan2(lastP[1] - prevP[1], lastP[0] - prevP[0]);

      ctx.beginPath();
      ctx.moveTo(lastP[0], lastP[1]);
      ctx.lineTo(lastP[0] + Math.cos(angle - 0.35) * 10, lastP[1] + Math.sin(angle - 0.35) * 10);
      ctx.moveTo(lastP[0], lastP[1]);
      ctx.lineTo(lastP[0] + Math.cos(angle + 0.35) * 10, lastP[1] + Math.sin(angle + 0.35) * 10);
      ctx.strokeStyle = theme.riverColor;
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  });
}

function renderTradeRoutes(ctx) {
  (worldData.layers.routes || []).forEach(rt => {
    if (!rt.points || rt.points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(rt.points[0][0], rt.points[0][1]);
    for (let i = 1; i < rt.points.length; i++) ctx.lineTo(rt.points[i][0], rt.points[i][1]);
    ctx.strokeStyle = rt.type === 'sea' ? '#fde047' : '#d97706';
    ctx.lineWidth = 2.4;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  });
}

function renderIsometricTerrain(rCtx, theme) {
  const entities = [];

  if (isLayerActive('orography')) {
    (worldData.layers.orography || []).forEach(m => {
      entities.push({ kind: 'mountain', ...m });
    });
  }

  if (isLayerActive('biomes')) {
    (worldData.layers.biomes || []).forEach(b => {
      entities.push({ kind: 'tree', ...b });
    });
  }

  if (isLayerActive('resources')) {
    (worldData.layers.resources || []).forEach(res => {
      if (res.coords) entities.push({ kind: 'resource', x: res.coords[0], y: res.coords[1], ...res });
    });
  }

  // Y-Sorting (Norte atrás do Sul)
  entities.sort((a, b) => a.y - b.y);

  // Extrusão vertical 2.5D de perspectiva reativa à inclinação
  const tiltFactor = 1 + Math.sin(camTilt * Math.PI / 180) * 0.45;

  entities.forEach(ent => {
    if (ent.kind === 'mountain') {
      if (ent.isHill) {
        drawHillMound(rCtx, ent.x, ent.y, (ent.size || 24) * tiltFactor, theme);
      } else {
        drawIsometricMountain(rCtx, ent.x, ent.y, (ent.size || 30) * tiltFactor, ent.style || mountainStyle, theme);
      }
    } else if (ent.kind === 'tree') {
      if (ent.type === 'oak') {
        drawOakTree(rCtx, ent.x, ent.y, (ent.size || 18) * tiltFactor, theme);
      } else {
        drawPineTree(rCtx, ent.x, ent.y, (ent.size || 18) * tiltFactor, theme);
      }
    } else if (ent.kind === 'resource') {
      drawResourceToken(rCtx, ent.x, ent.y, ent.type, ent.name);
    }
  });
}

// PILAR 3: OROGRAFIA ILUSTRADA (Picos Isométricos com Crista, Shading e Hachuras)
function drawIsometricMountain(ctx, x, y, size, style, theme) {
  const w = size * 1.15;
  const h = size * 1.45;
  const ridgeOffset = Math.sin(x * 0.04 + y * 0.06) * (w * 0.16);

  const leftFootX = x - w;
  const leftFootY = y + h * 0.12;
  const rightFootX = x + w;
  const rightFootY = y + h * 0.12;
  const ridgeBaseX = x + ridgeOffset;
  const ridgeBaseY = y + h * 0.22;
  const apexX = x;
  const apexY = y - h;

  // 1. Sombra de Contato Basal (Aterra a montanha suavemente no solo)
  ctx.beginPath();
  ctx.ellipse(x + 4, y + 3, w * 0.95, h * 0.22, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 12, 8, 0.35)';
  ctx.fill();

  // Esporas laterais de sopé da montanha
  ctx.beginPath();
  ctx.moveTo(leftFootX, leftFootY);
  ctx.quadraticCurveTo(leftFootX - w * 0.2, leftFootY + 4, leftFootX - w * 0.35, leftFootY + 6);
  ctx.moveTo(rightFootX, rightFootY);
  ctx.quadraticCurveTo(rightFootX + w * 0.2, rightFootY + 4, rightFootX + w * 0.35, rightFootY + 6);
  ctx.strokeStyle = theme.mountainRidge || '#1e140d';
  ctx.lineWidth = 1.3;
  ctx.stroke();

  // 2. Face Noroeste Iluminada (Luz Solar)
  ctx.beginPath();
  ctx.moveTo(apexX, apexY);
  ctx.lineTo(leftFootX, leftFootY);
  ctx.lineTo(ridgeBaseX, ridgeBaseY);
  ctx.closePath();
  ctx.fillStyle = (style === 'snow') ? '#fbfcfe' : (theme.mountainSun || '#fdfcf9');
  ctx.fill();
  ctx.strokeStyle = theme.mountainRidge || '#1e140d';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // 3. Face Sudeste Sombreada (Sombra & Hachuras de Gravura)
  ctx.beginPath();
  ctx.moveTo(apexX, apexY);
  ctx.lineTo(ridgeBaseX, ridgeBaseY);
  ctx.lineTo(rightFootX, rightFootY);
  ctx.closePath();
  ctx.fillStyle = (style === 'dark') ? '#2a221b' : (theme.mountainShadow || '#6e5e4e');
  ctx.fill();
  ctx.strokeStyle = theme.mountainRidge || '#1e140d';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // 4. Hachuras Cruzadas Bico de Pena na Face Sombreada
  ctx.save();
  ctx.beginPath();
  const numHatches = Math.max(6, Math.floor(size * 0.32));
  for (let i = 1; i <= numHatches; i++) {
    const t = i / (numHatches + 1);
    const startX = apexX * (1 - t) + ridgeBaseX * t;
    const startY = apexY * (1 - t) + ridgeBaseY * t;
    const hatchLen = (size * 0.35) * (0.6 + Math.sin(t * Math.PI) * 0.7);
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + hatchLen, startY + hatchLen * 0.45);
  }
  ctx.strokeStyle = 'rgba(20, 14, 8, 0.55)';
  ctx.lineWidth = 1.0;
  ctx.stroke();
  ctx.restore();

  // 5. Crista Central Meandrosa (Ridge Line Marcante)
  ctx.beginPath();
  ctx.moveTo(apexX, apexY);
  ctx.quadraticCurveTo(apexX + ridgeOffset * 0.5, apexY + h * 0.5, ridgeBaseX, ridgeBaseY);
  ctx.strokeStyle = theme.mountainRidge || '#1e140d';
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // 6. Pico Alpino de Neve Eterna
  if (style === 'snow' || h > 36) {
    ctx.beginPath();
    ctx.moveTo(apexX, apexY);
    ctx.lineTo(apexX - w * 0.35, apexY + h * 0.38);
    ctx.lineTo(apexX - w * 0.12, apexY + h * 0.3);
    ctx.lineTo(apexX + ridgeOffset * 0.4, apexY + h * 0.33);
    ctx.lineTo(apexX + w * 0.28, apexY + h * 0.36);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = theme.mountainRidge || '#1e140d';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}

function drawHillMound(ctx, x, y, size, theme) {
  const w = size * 1.25;
  const h = size * 0.75;

  // Sombra de contato
  ctx.beginPath();
  ctx.ellipse(x + 4, y + 3, w * 0.9, h * 0.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 12, 8, 0.26)';
  ctx.fill();

  // Morro campestre suave
  ctx.beginPath();
  ctx.arc(x, y + h * 0.2, w * 0.8, Math.PI, 0);
  ctx.fillStyle = theme.landFill;
  ctx.fill();
  ctx.strokeStyle = theme.mountainRidge;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Hachuras curvas no lado direito da colina
  ctx.beginPath();
  for (let a = 0.2; a < 0.75; a += 0.16) {
    ctx.arc(x, y + h * 0.2, w * (0.8 - a * 0.4), Math.PI * (1.6 - a * 0.2), Math.PI * (1.9 - a * 0.1));
  }
  ctx.strokeStyle = 'rgba(20, 14, 8, 0.38)';
  ctx.lineWidth = 1.1;
  ctx.stroke();
}

// PILAR 4: VEGETAÇÃO EM MASSA (Pinheiros Nórdicos & Carvalhos Volumosos)
function drawPineTree(ctx, x, y, size, theme) {
  const w = size * 0.58;
  const h = size * 1.22;

  // Sombra do solo
  ctx.fillStyle = 'rgba(15, 12, 8, 0.28)';
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 2, w * 0.85, h * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tronco de madeira escura
  ctx.strokeStyle = '#2b1b11';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(x, y - h * 0.22);
  ctx.lineTo(x, y + 2);
  ctx.stroke();

  // 3 Camadas Triangulares Sobrepostas (Copa Nórdica)
  const tiers = [
    { dy: -h, tw: w * 0.62, th: h * 0.42 },
    { dy: -h * 0.68, tw: w * 0.88, th: h * 0.48 },
    { dy: -h * 0.34, tw: w * 1.05, th: h * 0.52 }
  ];

  tiers.forEach(t => {
    // Face iluminada esquerda
    ctx.beginPath();
    ctx.moveTo(x, y + t.dy);
    ctx.lineTo(x - t.tw, y + t.dy + t.th);
    ctx.lineTo(x, y + t.dy + t.th * 0.9);
    ctx.closePath();
    ctx.fillStyle = '#2f633d';
    ctx.fill();
    ctx.strokeStyle = '#18241b';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Face sombreada direita
    ctx.beginPath();
    ctx.moveTo(x, y + t.dy);
    ctx.lineTo(x, y + t.dy + t.th * 0.9);
    ctx.lineTo(x + t.tw, y + t.dy + t.th);
    ctx.closePath();
    ctx.fillStyle = theme.treePine || '#163622';
    ctx.fill();
    ctx.strokeStyle = '#18241b';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  });
}

function drawOakTree(ctx, x, y, size, theme) {
  const r = size * 0.58;

  // Sombra do solo
  ctx.fillStyle = 'rgba(15, 12, 8, 0.28)';
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 2, r * 1.25, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tronco com ramificação
  ctx.strokeStyle = '#2b1b11';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(x, y - r * 0.4);
  ctx.lineTo(x, y + 2);
  ctx.stroke();

  // Copa arredondada em nuvem volumosa
  ctx.beginPath();
  ctx.arc(x, y - r, r, 0, Math.PI * 2);
  ctx.arc(x - r * 0.4, y - r * 0.9, r * 0.6, 0, Math.PI * 2);
  ctx.arc(x + r * 0.4, y - r * 0.9, r * 0.6, 0, Math.PI * 2);
  ctx.fillStyle = theme.treeOak || '#345e2a';
  ctx.fill();
  ctx.strokeStyle = '#1a2414';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Destaque de luz foliar no topo esquerdo
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 1.2, r * 0.42, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fill();
}

function drawResourceToken(ctx, x, y, type, name) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('💎', x, y + 3);
  ctx.restore();
}

// PILAR 6: MOLDURA CARTOGRÁFICA CLÁSSICA COM RÉGUA GRADUADA NÁUTICA
function drawCartographicBorder(ctx, theme) {
  ctx.save();

  const outerW = 988, outerH = 688;
  const x0 = 6, y0 = 6;
  const innerMargin = 12;

  // 1. Linha Externa Grossa
  ctx.strokeStyle = theme.borderOuter || '#221910';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x0, y0, outerW, outerH);

  // 2. Faixa Graduada Náutica (Régua de Latitude / Longitude com Alternância Preto/Branco)
  const bandX = x0 + 2.5;
  const bandY = y0 + 2.5;
  const bandW = outerW - 5;
  const bandH = outerH - 5;
  const tickStep = 25; // 25px por tick

  ctx.lineWidth = 1;
  // Borda superior e inferior
  for (let x = bandX; x < bandX + bandW; x += tickStep) {
    const isDark = Math.floor((x - bandX) / tickStep) % 2 === 0;
    ctx.fillStyle = isDark ? (theme.borderOuter || '#221910') : (theme.mountainSun || '#f7f4eb');
    ctx.fillRect(x, bandY, Math.min(tickStep, bandX + bandW - x), innerMargin);
    ctx.fillRect(x, bandY + bandH - innerMargin, Math.min(tickStep, bandX + bandW - x), innerMargin);
  }

  // Borda esquerda e direita
  for (let y = bandY; y < bandY + bandH; y += tickStep) {
    const isDark = Math.floor((y - bandY) / tickStep) % 2 === 0;
    ctx.fillStyle = isDark ? (theme.borderOuter || '#221910') : (theme.mountainSun || '#f7f4eb');
    ctx.fillRect(bandX, y, innerMargin, Math.min(tickStep, bandY + bandH - y));
    ctx.fillRect(bandX + bandW - innerMargin, y, innerMargin, Math.min(tickStep, bandY + bandH - y));
  }

  // Linhas limitadoras da régua
  ctx.strokeStyle = theme.borderOuter || '#221910';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(bandX + innerMargin, bandY + innerMargin, bandW - innerMargin * 2, bandH - innerMargin * 2);

  // Fio dourado decorativo interno
  ctx.strokeStyle = theme.borderInner || '#d4a373';
  ctx.lineWidth = 1;
  ctx.strokeRect(bandX + innerMargin + 4, bandY + innerMargin + 4, bandW - innerMargin * 2 - 8, bandH - innerMargin * 2 - 8);

  // 3. Cantoneiras de Filigrana Heráldica nos 4 Cantos
  const corners = [
    [x0 + innerMargin / 2 + 1, y0 + innerMargin / 2 + 1],
    [x0 + outerW - innerMargin / 2 - 1, y0 + innerMargin / 2 + 1],
    [x0 + innerMargin / 2 + 1, y0 + outerH - innerMargin / 2 - 1],
    [x0 + outerW - innerMargin / 2 - 1, y0 + outerH - innerMargin / 2 - 1]
  ];

  corners.forEach(([cx, cy]) => {
    ctx.fillStyle = theme.borderInner || '#e9c46a';
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = theme.borderOuter || '#221910';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

// PILAR 6: FITAS HERÁLDICAS DE PERGAMINHO DOBRADO (RIBBONS) & RÓTULOS ARQUEADOS
function createHeraldicRibbonSvg(x, y, name, type) {
  const textLen = Math.max(name.length * 8.5 + 24, 75);
  const halfW = textLen / 2;
  const ribbonY = y + 7;
  const ribbonH = 18;
  const tailExt = 14;

  // Emblema heráldico conforme o tipo
  let iconSvg = '';
  if (type === 'capital') {
    iconSvg = `
      <polygon points="${x-12},${y-14} ${x-12},${y} ${x+12},${y} ${x+12},${y-14}" fill="#d4c3aa" stroke="#261a10" stroke-width="1.8"/>
      <polygon points="${x-15},${y-14} ${x-10},${y-24} ${x-5},${y-14}" fill="#dc2626" stroke="#261a10" stroke-width="1.4"/>
      <polygon points="${x+5},${y-14} ${x+10},${y-24} ${x+15},${y-14}" fill="#dc2626" stroke="#261a10" stroke-width="1.4"/>
      <polygon points="${x-5},${y-16} ${x},${y-28} ${x+5},${y-16}" fill="#eab308" stroke="#261a10" stroke-width="1.6"/>
      <rect x="${x-3}" y="${y-6}" width="6" height="6" fill="#20150d" rx="1"/>
    `;
  } else if (type === 'port') {
    iconSvg = `
      <rect x="${x-9}" y="${y-12}" width="18" height="12" fill="#cbd5e1" stroke="#261a10" stroke-width="1.8"/>
      <polygon points="${x-4},${y-12} ${x},${y-25} ${x+4},${y-12}" fill="#0284c7" stroke="#261a10" stroke-width="1.5"/>
      <line x1="${x-14}" y1="${y}" x2="${x+14}" y2="${y}" stroke="#64748b" stroke-width="3"/>
    `;
  } else if (type === 'fortress') {
    iconSvg = `
      <rect x="${x-10}" y="${y-14}" width="20" height="14" fill="#94a3b8" stroke="#261a10" stroke-width="1.8"/>
      <rect x="${x-10}" y="${y-18}" width="5" height="5" fill="#64748b" stroke="#261a10" stroke-width="1.2"/>
      <rect x="${x-2}" y="${y-18}" width="4" height="5" fill="#64748b" stroke="#261a10" stroke-width="1.2"/>
      <rect x="${x+5}" y="${y-18}" width="5" height="5" fill="#64748b" stroke="#261a10" stroke-width="1.2"/>
      <path d="M ${x-3} ${y} L ${x-3} ${y-6} A 3 3 0 0 1 ${x+3} ${y-6} L ${x+3} ${y} Z" fill="#1e150d"/>
    `;
  } else {
    iconSvg = `
      <rect x="${x-8}" y="${y-12}" width="16" height="12" fill="#e2d8c3" stroke="#261a10" stroke-width="1.6"/>
      <polygon points="${x-8},${y-12} ${x-4},${y-20} ${x},${y-12}" fill="#b45309" stroke="#261a10" stroke-width="1.3"/>
      <polygon points="${x},${y-12} ${x+4},${y-20} ${x+8},${y-12}" fill="#b45309" stroke="#261a10" stroke-width="1.3"/>
      <rect x="${x-2.5}" y="${y-5}" width="5" height="5" fill="#20150d" rx="1"/>
    `;
  }

  // Faixa heráldica dobrada com pontas bifurcadas (fishtail)
  const leftX = x - halfW;
  const rightX = x + halfW;
  const topY = ribbonY;
  const botY = ribbonY + ribbonH;

  const ribbonSvg = `
    <!-- Dobra Sombra Esquerda -->
    <polygon points="${leftX},${topY+3} ${leftX},${botY-3} ${leftX-8},${botY+4}" fill="#2a1d13"/>
    <!-- Ponta Rabo de Peixe Esquerda -->
    <polygon points="${leftX},${topY+3} ${leftX-tailExt},${topY+6} ${leftX-tailExt+5},${topY+ribbonH/2+4} ${leftX-tailExt},${botY+5} ${leftX},${botY-3}" fill="#eeddc3" stroke="#2b1a0d" stroke-width="1.4"/>

    <!-- Dobra Sombra Direita -->
    <polygon points="${rightX},${topY+3} ${rightX},${botY-3} ${rightX+8},${botY+4}" fill="#2a1d13"/>
    <!-- Ponta Rabo de Peixe Direita -->
    <polygon points="${rightX},${topY+3} ${rightX+tailExt},${topY+6} ${rightX+tailExt-5},${topY+ribbonH/2+4} ${rightX+tailExt},${botY+5} ${rightX},${botY-3}" fill="#eeddc3" stroke="#2b1a0d" stroke-width="1.4"/>

    <!-- Corpo Central do Pergaminho -->
    <rect x="${leftX}" y="${topY}" width="${textLen}" height="${ribbonH}" rx="2" fill="#fffaf0" stroke="#2b1a0d" stroke-width="1.8"/>
    <rect x="${leftX+2}" y="${topY+2}" width="${textLen-4}" height="${ribbonH-4}" rx="1" fill="none" stroke="#d4a373" stroke-width="0.8"/>

    <!-- Tipografia Nobre de Época -->
    <text x="${x}" y="${topY + 13}" fill="#24170e" font-size="10.5" font-weight="800" text-anchor="middle" font-family="'Cinzel', 'IM Fell English', serif" letter-spacing="1.2px">${name}</text>
  `;

  return iconSvg + ribbonSvg;
}

// Overlay Interativo SVG
function renderInteractiveOverlay(theme) {
  const svg = document.getElementById('svgOverlay');
  if (!svg || !worldData) return;
  svg.innerHTML = '';

  // Nomes de Reinos no centro de massa das células
  if (isLayerActive('kingdoms')) {
    (worldData.layers.kingdoms || []).forEach(kng => {
      let cx = 500, cy = 350;
      if (kng.cells && kng.cells.length > 0) {
        cx = Math.round(kng.cells.reduce((sum, c) => sum + c[0], 0) / kng.cells.length);
        cy = Math.round(kng.cells.reduce((sum, c) => sum + c[1], 0) / kng.cells.length);
      } else if (kng.center) {
        cx = kng.center[0]; cy = kng.center[1];
      }

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.style.cursor = 'pointer';
      g.innerHTML = `
        <text x="${cx}" y="${cy}" fill="${kng.color || '#e11d48'}" font-size="12" font-weight="900" text-anchor="middle" font-family="'Cinzel', serif" style="text-shadow: 0 2px 6px #000, 0 0 10px rgba(0,0,0,0.8)">👑 ${kng.name}</text>
      `;
      g.addEventListener('click', () => inspectFeature('kingdoms', kng));
      svg.appendChild(g);
    });
  }

  // Cidades Medievais com Fitas Heráldicas Dobradas
  if (isLayerActive('settlements')) {
    (worldData.layers.settlements || []).forEach(s => {
      if (!isFeatureActiveInEra(s) || !s.coords) return;
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'carto-settlement-ribbon');

      const x = s.coords[0];
      const y = s.coords[1];

      g.innerHTML = createHeraldicRibbonSvg(x, y, s.name, s.type || 'city');
      g.addEventListener('click', () => inspectFeature('settlements', s));
      svg.appendChild(g);
    });
  }

  // Cursor Visual da Ferramenta
  const cursorGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  cursorGroup.id = 'toolCursorIndicator';
  cursorGroup.style.pointerEvents = 'none';
  svg.appendChild(cursorGroup);
}

// Atualiza Cursor Hexagonal em Tempo Real
function updateToolCursorIndicator(x, y) {
  const g = document.getElementById('toolCursorIndicator');
  if (!g) return;

  if (studioActiveTool === 'select') {
    g.innerHTML = '';
    return;
  }

  const hexPts = getHexagonPoints(x, y, brushRadius);
  const ptsStr = hexPts.map(p => p.join(',')).join(' ');

  if (studioActiveTool === 'kingdom') {
    g.innerHTML = `
      <polygon points="${ptsStr}" fill="rgba(225, 29, 72, 0.22)" stroke="${kingdomColor || '#e11d48'}" stroke-width="2.2" stroke-dasharray="5,4" />
      <text x="${x}" y="${y + 4}" fill="#ffffff" font-size="10" font-weight="900" text-anchor="middle">👑</text>
    `;
  } else if (studioActiveTool === 'land') {
    g.innerHTML = `
      <polygon points="${ptsStr}" fill="rgba(233, 196, 106, 0.22)" stroke="#e9c46a" stroke-width="2.2" stroke-dasharray="5,4" />
      <circle cx="${x}" cy="${y}" r="2.5" fill="#e9c46a" />
    `;
  } else if (studioActiveTool === 'erase') {
    g.innerHTML = `
      <polygon points="${ptsStr}" fill="rgba(239, 68, 68, 0.22)" stroke="#ef4444" stroke-width="2.2" stroke-dasharray="5,4" />
      <line x1="${x - 10}" y1="${y}" x2="${x + 10}" y2="${y}" stroke="#ef4444" stroke-width="1.8" />
      <line x1="${x}" y1="${y - 10}" x2="${x}" y2="${y + 10}" stroke="#ef4444" stroke-width="1.8" />
    `;
  } else {
    g.innerHTML = `
      <circle cx="${x}" cy="${y}" r="${brushRadius}" fill="rgba(233, 196, 106, 0.15)" stroke="#e9c46a" stroke-width="1.8" stroke-dasharray="4,4" />
      <circle cx="${x}" cy="${y}" r="2.5" fill="#e9c46a" />
    `;
  }
}

// Atualização da Escala Cartográfica Dinâmica (Baseada no Zoom Real)
function updateDynamicScale() {
  const scaleText = document.getElementById('scaleTextVal');
  const scaleBar = document.getElementById('scaleBarElement');
  if (!scaleText || !scaleBar) return;

  // 1000px de canvas = 2500 km -> 1px de canvas = 2.5 km
  // Na tela com zoom: 1px de tela = 2.5 / camZoom km
  // Procuramos o melhor valor arredondado para uma barra de ~80px de largura na tela:
  const targetKm = (80 / camZoom) * 2.5;
  const standardKmSteps = [10, 25, 50, 75, 100, 150, 200, 250, 300, 500, 750, 1000, 1500, 2000];
  let bestKm = standardKmSteps[0];
  let minDiff = Infinity;
  for (const step of standardKmSteps) {
    const diff = Math.abs(step - targetKm);
    if (diff < minDiff) { minDiff = diff; bestKm = step; }
  }

  // Largura física em pixels da barra correspondente ao melhor valor km:
  const barWidthPx = Math.round((bestKm / 2.5) * camZoom);
  scaleBar.style.width = `${Math.max(35, Math.min(160, barWidthPx))}px`;
  scaleText.textContent = `${bestKm} km`;
}

function isLayerActive(layerKey) {
  const found = LAYER_CONFIG.find(c => c.key === layerKey);
  return found ? found.active : true;
}

function isFeatureActiveInEra(feat) {
  if (currentSelectedEra === null) return true;
  if (!feat.era) return true;
  const eraNumMap = { 'Era I': 1, 'Era II': 2, 'Era III': 3, 'Era IV': 4 };
  const featEra = eraNumMap[feat.era] || 1;
  return featEra <= currentSelectedEra;
}

// ==========================================
// 5. GAVETAS LATERAIS RETRÁTEIS
// ==========================================
function bindDrawers() {
  const leftDrawer = document.getElementById('leftDrawer');
  const rightDrawer = document.getElementById('rightDrawer');

  document.getElementById('btnToggleLeftDrawer')?.addEventListener('click', () => leftDrawer?.classList.toggle('open'));
  document.getElementById('btnCloseLeftDrawer')?.addEventListener('click', () => leftDrawer?.classList.remove('open'));
  document.getElementById('btnToggleRightDrawer')?.addEventListener('click', () => rightDrawer?.classList.toggle('open'));
  document.getElementById('btnCloseRightDrawer')?.addEventListener('click', () => rightDrawer?.classList.remove('open'));

  const tabBtns = document.querySelectorAll('.tab-header .tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const paneId = btn.getAttribute('data-pane');
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      document.getElementById(paneId)?.classList.add('active');
    });
  });

  document.getElementById('mapStyleSelect')?.addEventListener('change', (e) => {
    currentThemeKey = e.target.value;
    renderScene();
  });
}

function openRightDrawerTab(tabId) {
  document.getElementById('rightDrawer')?.classList.add('open');
  document.querySelectorAll('.tab-header .tab-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-pane') === tabId));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === tabId));
}

function buildLayerMenu() {
  const container = document.getElementById('layerTogglesList');
  if (!container || !worldData) return;
  container.innerHTML = '';

  LAYER_CONFIG.forEach(cfg => {
    const count = (worldData.layers[cfg.key] || []).length;
    const row = document.createElement('label');
    row.className = 'layer-item';
    row.innerHTML = `
      <span><input type="checkbox" data-layer="${cfg.key}" ${cfg.active ? 'checked' : ''}/> ${cfg.label}</span>
      <span class="badge">${count}</span>
    `;
    row.querySelector('input')?.addEventListener('change', (e) => {
      cfg.active = e.target.checked;
      renderScene();
    });
    container.appendChild(row);
  });

  document.getElementById('btnEnableAllLayers')?.addEventListener('click', () => {
    LAYER_CONFIG.forEach(c => c.active = true);
    buildLayerMenu();
    renderScene();
  });
  document.getElementById('btnDisableAllLayers')?.addEventListener('click', () => {
    LAYER_CONFIG.forEach(c => c.active = false);
    buildLayerMenu();
    renderScene();
  });
}

// ==========================================
// 6. CÂMERA 2.5D COM PROFUNDIDADE
// ==========================================
function updateCameraTransform() {
  const stage = document.getElementById('stage25d');
  if (!stage) return;
  stage.style.transform = `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) rotateX(${camTilt}deg) rotateZ(${camRot}deg) scale(${camZoom})`;

  const tiltLbl = document.getElementById('tiltVal');
  const rotLbl = document.getElementById('rotVal');
  const zoomLbl = document.getElementById('zoomVal');
  if (tiltLbl) tiltLbl.textContent = camTilt + '°';
  if (rotLbl) rotLbl.textContent = camRot + '°';
  if (zoomLbl) zoomLbl.textContent = Math.round(camZoom * 100) + '%';

  updateDynamicScale();
  renderScene();
}

function bindCameraControls() {
  const vp = document.getElementById('viewport');

  document.getElementById('camTilt')?.addEventListener('input', (e) => { camTilt = parseInt(e.target.value, 10); updateCameraTransform(); });
  document.getElementById('camRot')?.addEventListener('input', (e) => { camRot = parseInt(e.target.value, 10); updateCameraTransform(); });
  document.getElementById('camZoom')?.addEventListener('input', (e) => { camZoom = parseInt(e.target.value, 10) / 100; updateCameraTransform(); });
  document.getElementById('btnResetCamera')?.addEventListener('click', () => {
    panX = 0; panY = 0; camTilt = 0; camRot = 0; camZoom = 0.95;
    document.getElementById('camTilt').value = 0;
    document.getElementById('camRot').value = 0;
    document.getElementById('camZoom').value = 95;
    updateCameraTransform();
    showToast('Câmera alinhada e centralizada!', 'info');
  });

  vp?.addEventListener('mousedown', (e) => {
    if (e.button === 2 || studioActiveTool === 'select') {
      isPanning = true;
      startPanX = e.clientX - panX;
      startPanY = e.clientY - panY;
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (isPanning) {
      panX = e.clientX - startPanX;
      panY = e.clientY - startPanY;
      updateCameraTransform();
    }
  });

  window.addEventListener('mouseup', () => { isPanning = false; });
  vp?.addEventListener('contextmenu', (e) => e.preventDefault());

  vp?.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.06 : 0.06;
    camZoom = Math.max(0.4, Math.min(2.2, camZoom + delta));
    const slider = document.getElementById('camZoom');
    if (slider) slider.value = Math.round(camZoom * 100);
    updateCameraTransform();
  }, { passive: false });
}

// ==========================================
// 7. SISTEMA DE HISTÓRICO (UNDO/REDO) & CLIPBOARD
// ==========================================
function recordHistorySnapshot() {
  if (!worldData) return;
  const snapshot = {
    worldData: JSON.parse(JSON.stringify(worldData)),
    landMaskData: landMaskCtx ? landMaskCtx.getImageData(0, 0, 1000, 700) : null
  };
  historyStack.push(snapshot);
  if (historyStack.length > MAX_HISTORY) historyStack.shift();
  redoStack.length = 0; // Limpa redo após nova ação
}

function undo() {
  if (historyStack.length === 0) {
    showToast('Nenhuma ação anterior para desfazer.', 'info');
    return;
  }
  // Guarda estado atual no redo
  const currentSnapshot = {
    worldData: JSON.parse(JSON.stringify(worldData)),
    landMaskData: landMaskCtx ? landMaskCtx.getImageData(0, 0, 1000, 700) : null
  };
  redoStack.push(currentSnapshot);

  // Restaura anterior
  const previous = historyStack.pop();
  worldData = previous.worldData;
  if (previous.landMaskData && landMaskCtx) {
    landMaskCtx.putImageData(previous.landMaskData, 0, 0);
  }
  saveWorldLocally();
  buildLayerMenu();
  renderScene();
  showToast('↩️ Desfazer realizado com sucesso.', 'info');
}

function redo() {
  if (redoStack.length === 0) {
    showToast('Nenhuma ação para refazer.', 'info');
    return;
  }
  const currentSnapshot = {
    worldData: JSON.parse(JSON.stringify(worldData)),
    landMaskData: landMaskCtx ? landMaskCtx.getImageData(0, 0, 1000, 700) : null
  };
  historyStack.push(currentSnapshot);

  const next = redoStack.pop();
  worldData = next.worldData;
  if (next.landMaskData && landMaskCtx) {
    landMaskCtx.putImageData(next.landMaskData, 0, 0);
  }
  saveWorldLocally();
  buildLayerMenu();
  renderScene();
  showToast('↪️ Refazer realizado com sucesso.', 'info');
}

function copySelected() {
  if (!selectedFeature) {
    showToast('Nenhuma feição selecionada para copiar.', 'info');
    return;
  }
  clipboardFeature = {
    layerKey: selectedFeature.layerKey,
    featData: JSON.parse(JSON.stringify(selectedFeature.feat))
  };
  showToast(`📋 Copiado: "${selectedFeature.feat.name || 'Feição'}"`, 'success');
}

function cutSelected() {
  if (!selectedFeature) {
    showToast('Nenhuma feição selecionada para recortar.', 'info');
    return;
  }
  recordHistorySnapshot();
  clipboardFeature = {
    layerKey: selectedFeature.layerKey,
    featData: JSON.parse(JSON.stringify(selectedFeature.feat))
  };
  deleteSingleFeature(selectedFeature.layerKey, selectedFeature.feat.id);
  selectedFeature = null;
  showToast(`✂️ Recortado: "${clipboardFeature.featData.name || 'Feição'}"`, 'info');
}

function pasteClipboard() {
  if (!clipboardFeature) {
    showToast('Área de transferência vazia.', 'info');
    return;
  }
  recordHistorySnapshot();
  const layerKey = clipboardFeature.layerKey;
  const newFeat = JSON.parse(JSON.stringify(clipboardFeature.featData));
  newFeat.id = `feat_${Date.now()}`;
  newFeat.name = (newFeat.name || 'Feição') + ' (Cópia)';

  // Posiciona nas coordenadas atuais do mouse no palco
  const [mx, my] = currentMouseStagePos;
  if (newFeat.coords) newFeat.coords = [mx, my];
  else if (newFeat.center) newFeat.center = [mx, my];
  else if (newFeat.x !== undefined && newFeat.y !== undefined) {
    newFeat.x = mx; newFeat.y = my;
  }

  if (!worldData.layers[layerKey]) worldData.layers[layerKey] = [];
  worldData.layers[layerKey].push(newFeat);
  saveWorldLocally();
  buildLayerMenu();
  renderScene();
  inspectFeature(layerKey, newFeat);
  showToast(`📋 Colado: "${newFeat.name}" em [${mx}, ${my}]`, 'success');
}

function deleteSelected() {
  if (!selectedFeature) return;
  recordHistorySnapshot();
  deleteSingleFeature(selectedFeature.layerKey, selectedFeature.feat.id);
  selectedFeature = null;
}

function bindKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Ignora se estiver digitando em campo de texto
    const tag = document.activeElement?.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undo();
    } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
      e.preventDefault();
      redo();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      copySelected();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
      e.preventDefault();
      cutSelected();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      pasteClipboard();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      deleteSelected();
    }
  });
}

// ==========================================
// 8. BARRA DE FERRAMENTAS DO CRIADOR (PINCEIS)
// ==========================================
function bindStudioToolbar() {
  const toolBtns = document.querySelectorAll('#studioToolbar .tool-btn[data-tool]');
  const optionsBar = document.getElementById('toolOptionsBar');
  const optMountainStyle = document.getElementById('optMountainStyle');
  const optForestType = document.getElementById('optForestType');
  const optCityTypes = document.getElementById('optCityTypes');
  const optKingdomColor = document.getElementById('optKingdomColor');
  const vp = document.getElementById('viewport');

  const radiusSlider = document.getElementById('brushRadiusSlider');
  const radiusVal = document.getElementById('brushRadiusVal');
  if (radiusSlider && radiusVal) {
    radiusSlider.addEventListener('input', (e) => {
      brushRadius = parseInt(e.target.value, 10);
      radiusVal.textContent = brushRadius + 'px';
      updateToolCursorIndicator(currentMouseStagePos[0], currentMouseStagePos[1]);
    });
  }

  toolBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      toolBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const tool = btn.getAttribute('data-tool');
      studioActiveTool = tool;

      if (tool === 'select') vp?.classList.remove('tool-active');
      else vp?.classList.add('tool-active');

      optionsBar?.classList.add('visible');
      if (optMountainStyle) optMountainStyle.style.display = (tool === 'mountain') ? 'flex' : 'none';
      if (optForestType) optForestType.style.display = (tool === 'forest') ? 'flex' : 'none';
      if (optCityTypes) optCityTypes.style.display = (tool === 'city') ? 'flex' : 'none';
      if (optKingdomColor) optKingdomColor.style.display = (tool === 'kingdom') ? 'flex' : 'none';

      activeStrokePoints = [];
    });
  });

  document.getElementById('mountainStyleSelect')?.addEventListener('change', (e) => { mountainStyle = e.target.value; });
  document.getElementById('forestTypeSelect')?.addEventListener('change', (e) => { forestType = e.target.value; });
  document.getElementById('cityTypeSelect')?.addEventListener('change', (e) => { cityType = e.target.value; });
  document.getElementById('kingdomColorInput')?.addEventListener('change', (e) => { kingdomColor = e.target.value; });

  const stage = document.getElementById('stage25d');
  stage?.addEventListener('mousedown', handleStageMouseDown);
  stage?.addEventListener('mousemove', handleStageMouseMove);
  stage?.addEventListener('mouseup', handleStageMouseUp);

  document.getElementById('btnSaveToDisk')?.addEventListener('click', saveWorldDataToServer);
  document.getElementById('btnDownloadJson')?.addEventListener('click', downloadWorldJson);
  document.getElementById('btnExportPngHd')?.addEventListener('click', exportMapPng);
}

function getStageCoordinates(e) {
  const stage = document.getElementById('stage25d');
  if (!stage) return [500, 350];
  const rect = stage.getBoundingClientRect();
  const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000);
  const y = Math.round(((e.clientY - rect.top) / rect.height) * 700);
  return [Math.max(0, Math.min(1000, x)), Math.max(0, Math.min(700, y))];
}

// ==========================================
// 9. INTERAÇÃO CONTÍNUA DE PINCÉIS HEXAGONAIS
// ==========================================
function handleStageMouseDown(e) {
  if (e.button !== 0) return;
  const [x, y] = getStageCoordinates(e);
  currentMouseStagePos = [x, y];

  if (studioActiveTool === 'select') return;

  // Grava snapshot para Ctrl+Z
  recordHistorySnapshot();

  isDrawing = true;
  lastDrawX = x; lastDrawY = y;
  activeStrokePoints = [[x, y]];

  if (studioActiveTool === 'erase') {
    executeEraserAt(x, y, brushRadius);
  } else if (studioActiveTool === 'land') {
    paintLandHexagon(x, y, brushRadius, !e.shiftKey);
  } else if (studioActiveTool === 'mountain') {
    paintMountainPeak(x, y, brushRadius);
  } else if (studioActiveTool === 'hills') {
    paintHillMound(x, y, brushRadius);
  } else if (studioActiveTool === 'forest') {
    paintForestCluster(x, y, brushRadius);
  } else if (studioActiveTool === 'kingdom') {
    paintKingdomHexagon(x, y, brushRadius);
  } else if (studioActiveTool === 'resource') {
    paintResourceCluster(x, y);
  } else if (studioActiveTool === 'city') {
    stampCityAt(x, y);
  }
}

function handleStageMouseMove(e) {
  const [x, y] = getStageCoordinates(e);
  currentMouseStagePos = [x, y];
  updateToolCursorIndicator(x, y);

  if (!isDrawing) return;

  const dist = Math.hypot(x - lastDrawX, y - lastDrawY);

  if (studioActiveTool === 'erase') {
    executeEraserAt(x, y, brushRadius);
  } else if (studioActiveTool === 'land') {
    // Carimba hexágonos contínuos ao arrastar sem nenhum borrifado
    if (dist > brushRadius * 0.35) {
      paintLandHexagon(x, y, brushRadius, !e.shiftKey);
      lastDrawX = x; lastDrawY = y;
    }
  } else if (studioActiveTool === 'mountain' && dist > brushRadius * 0.65) {
    paintMountainPeak(x, y, brushRadius);
    lastDrawX = x; lastDrawY = y;
  } else if (studioActiveTool === 'hills' && dist > brushRadius * 0.65) {
    paintHillMound(x, y, brushRadius);
    lastDrawX = x; lastDrawY = y;
  } else if (studioActiveTool === 'forest' && dist > 14) {
    paintForestCluster(x, y, brushRadius);
    lastDrawX = x; lastDrawY = y;
  } else if (studioActiveTool === 'river' && dist > 10) {
    activeStrokePoints.push([x, y]);
    renderLiveRiverStroke();
    lastDrawX = x; lastDrawY = y;
  } else if (studioActiveTool === 'kingdom' && dist > brushRadius * 0.75) {
    paintKingdomHexagon(x, y, brushRadius);
    lastDrawX = x; lastDrawY = y;
  } else if (studioActiveTool === 'route' && dist > 12) {
    activeStrokePoints.push([x, y]);
    renderLiveRouteStroke();
    lastDrawX = x; lastDrawY = y;
  } else if (studioActiveTool === 'resource' && dist > 28) {
    paintResourceCluster(x, y);
    lastDrawX = x; lastDrawY = y;
  }
}

function handleStageMouseUp() {
  if (!isDrawing) return;
  isDrawing = false;

  if (studioActiveTool === 'river' && activeStrokePoints.length >= 2) {
    finalizeRiverFromStroke();
  } else if (studioActiveTool === 'route' && activeStrokePoints.length >= 2) {
    finalizeRouteFromStroke();
  }

  activeStrokePoints = [];
  saveWorldLocally();
  buildLayerMenu();
  renderScene();
}

// ==========================================
// 10. IMPLEMENTAÇÃO DOS PINCÉIS ARTÍSTICOS
// ==========================================

// Pincel de Terra com Base em Hexágonos (Sólido, Limpo, sem nenhum borrifado)
function paintLandHexagon(cx, cy, radius, isAdding = true) {
  if (!landMaskCtx) return;

  landMaskCtx.save();
  if (isAdding) {
    landMaskCtx.globalCompositeOperation = 'source-over';
    landMaskCtx.fillStyle = '#ffffff';
  } else {
    // Corta terra e revela o mar com tecla Shift segurada
    landMaskCtx.globalCompositeOperation = 'destination-out';
  }

  // Carimbo hexagonal sólido e limpo na coordenada do mouse
  drawHexagonPath(landMaskCtx, cx, cy, radius);
  landMaskCtx.fill();
  landMaskCtx.restore();

  renderScene();
}

// Pincel de Reinos com Células Hexagonais Reais
function paintKingdomHexagon(cx, cy, radius) {
  if (!worldData.layers.kingdoms) worldData.layers.kingdoms = [];

  // Localiza reino selecionado ou cria novo
  let kng = selectedFeature && selectedFeature.layerKey === 'kingdoms' ? selectedFeature.feat : null;
  if (!kng) {
    // Procura por proximidade de células
    kng = worldData.layers.kingdoms.find(k => {
      if (!k.cells) return false;
      return k.cells.some(c => Math.hypot(c[0] - cx, c[1] - cy) < radius * 2);
    });
  }

  if (!kng) {
    kng = {
      id: `kng_${Date.now()}`,
      name: `Reino de ${generateToponym('K')}`,
      center: [cx, cy],
      color: kingdomColor,
      cells: [],
      era: 'Era II',
      lore: 'Soberania territorial autônoma pintada com pincel hexagonal.'
    };
    worldData.layers.kingdoms.push(kng);
    selectedFeature = { layerKey: 'kingdoms', feat: kng };
  }

  if (!kng.cells) kng.cells = [];

  // Adiciona célula hexagonal se não estiver repetida
  const alreadyHas = kng.cells.some(c => Math.hypot(c[0] - cx, c[1] - cy) < radius * 0.5);
  if (!alreadyHas) {
    kng.cells.push([cx, cy, radius]);
  }

  renderScene();
}

// Pincel de Montanhas
function paintMountainPeak(cx, cy, radius) {
  if (!worldData.layers.orography) worldData.layers.orography = [];

  const size = Math.max(14, Math.round(radius * (0.8 + Math.random() * 0.35)));
  const peak = {
    id: `mnt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    x: cx + (Math.random() * 6 - 3),
    y: cy + (Math.random() * 6 - 3),
    size: size,
    style: mountainStyle
  };

  worldData.layers.orography.push(peak);
  renderScene();
}

// Pincel de Colinas
function paintHillMound(cx, cy, radius) {
  if (!worldData.layers.orography) worldData.layers.orography = [];

  const size = Math.max(12, Math.round(radius * 0.8));
  const hill = {
    id: `hill_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    x: cx,
    y: cy,
    size: size,
    isHill: true
  };

  worldData.layers.orography.push(hill);
  renderScene();
}

// PILAR 4: PINCEL DE FLORESTAS COM CLUSTERIZAÇÃO ORGÂNICA EM MASSA
function paintForestCluster(cx, cy, radius) {
  if (!worldData.layers.biomes) worldData.layers.biomes = [];

  const count = Math.max(5, Math.floor(radius * 0.35));
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.sqrt(Math.random()) * radius * 0.88;
    const tx = Math.round(cx + Math.cos(angle) * dist);
    const ty = Math.round(cy + Math.sin(angle) * dist);

    let tType = forestType;
    if (forestType === 'mixed') tType = Math.random() > 0.5 ? 'pine' : 'oak';

    worldData.layers.biomes.push({
      id: `tree_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      x: tx,
      y: ty,
      size: 15 + Math.floor(Math.random() * 8),
      type: tType
    });
  }

  renderScene();
}

// Pincel Contínuo de Rios
function renderLiveRiverStroke() {
  renderScene();
  const svg = document.getElementById('svgOverlay');
  if (!svg || activeStrokePoints.length < 1) return;

  const d = 'M ' + activeStrokePoints.map(p => p.join(' ')).join(' L ');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', '#00f5d4');
  path.setAttribute('stroke-width', '4');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(path);
}

function finalizeRiverFromStroke() {
  if (!worldData.layers.hydrography) worldData.layers.hydrography = [];
  const name = `Rio ${generateToponym('C')}`;

  worldData.layers.hydrography.push({
    id: `river_${Date.now()}`,
    name: name,
    points: [...activeStrokePoints],
    flow: 'high'
  });
  showToast(`Rio "${name}" pintado com sucesso!`, 'success');
}

// Pincel Contínuo de Rotas
function renderLiveRouteStroke() {
  renderScene();
  const svg = document.getElementById('svgOverlay');
  if (!svg || activeStrokePoints.length < 1) return;

  const d = 'M ' + activeStrokePoints.map(p => p.join(' ')).join(' L ');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', '#fbbf24');
  path.setAttribute('stroke-width', '3');
  path.setAttribute('stroke-dasharray', '5,5');
  svg.appendChild(path);
}

function finalizeRouteFromStroke() {
  if (!worldData.layers.routes) worldData.layers.routes = [];
  const name = `Estrada de ${generateToponym('K')}`;

  worldData.layers.routes.push({
    id: `route_${Date.now()}`,
    name: name,
    points: [...activeStrokePoints],
    type: 'land'
  });
  showToast(`Rota "${name}" traçada!`, 'success');
}

// Pincel de Recursos
function paintResourceCluster(cx, cy) {
  if (!worldData.layers.resources) worldData.layers.resources = [];
  const list = ['Mina de Prata', 'Forja de Aço', 'Salmoura Marítima', 'Porto de Pesca', 'Bosque de Carvalho'];
  const resName = list[Math.floor(Math.random() * list.length)];

  worldData.layers.resources.push({
    id: `res_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name: resName,
    coords: [cx, cy],
    type: 'resource'
  });

  renderScene();
}

// Carimbo de Cidades
function stampCityAt(x, y) {
  if (!worldData.layers.settlements) worldData.layers.settlements = [];
  const name = generateToponym('K');

  const city = {
    id: `city_${Date.now()}`,
    name: name,
    type: cityType,
    lang_family: 'K',
    era: 'Era II',
    coords: [x, y],
    population: 20000 + Math.floor(Math.random() * 50000),
    lore: `Imponente bastião fundado no coração das terras cartografadas.`
  };

  worldData.layers.settlements.push(city);
  saveWorldLocally();
  renderScene();
  buildLayerMenu();
  inspectFeature('settlements', city);
  showToast(`Assentamento "${name}" fundado em [${x}, ${y}]!`, 'success');
}

// ==========================================
// 11. A FERRAMENTA DE BORRACHA (APAGA APENAS ASSETS)
// ==========================================
function executeEraserAt(cx, cy, radius) {
  let erasedAny = false;

  // A BORRACHA NUNCA APAGA TERRA! A terra permanece 100% preservada.
  // Apaga apenas feições/assets:

  // 1. Apaga Montanhas e Colinas
  if (worldData.layers.orography) {
    const before = worldData.layers.orography.length;
    worldData.layers.orography = worldData.layers.orography.filter(m => {
      const peakY = m.y - (m.size || 25) * 0.5;
      return !isPointInHexagon(m.x, peakY, cx, cy, radius + (m.size || 25) * 0.7);
    });
    if (worldData.layers.orography.length !== before) erasedAny = true;
  }

  // 2. Apaga Árvores e Florestas
  if (worldData.layers.biomes) {
    const before = worldData.layers.biomes.length;
    worldData.layers.biomes = worldData.layers.biomes.filter(b => {
      const treeY = b.y - (b.size || 16) * 0.5;
      return !isPointInHexagon(b.x, treeY, cx, cy, radius + (b.size || 16) * 0.6);
    });
    if (worldData.layers.biomes.length !== before) erasedAny = true;
  }

  // 3. Apaga Cidades e Castelos
  if (worldData.layers.settlements) {
    const before = worldData.layers.settlements.length;
    worldData.layers.settlements = worldData.layers.settlements.filter(s => {
      if (!s.coords) return true;
      return !isPointInHexagon(s.coords[0], s.coords[1], cx, cy, radius + 20);
    });
    if (worldData.layers.settlements.length !== before) erasedAny = true;
  }

  // 4. Apaga Rios
  if (worldData.layers.hydrography) {
    const before = worldData.layers.hydrography.length;
    worldData.layers.hydrography = worldData.layers.hydrography.filter(r => {
      if (!r.points) return true;
      const intersects = r.points.some(p => isPointInHexagon(p[0], p[1], cx, cy, radius + 10));
      return !intersects;
    });
    if (worldData.layers.hydrography.length !== before) erasedAny = true;
  }

  // 5. Apaga Rotas
  if (worldData.layers.routes) {
    const before = worldData.layers.routes.length;
    worldData.layers.routes = worldData.layers.routes.filter(rt => {
      if (!rt.points) return true;
      const intersects = rt.points.some(p => isPointInHexagon(p[0], p[1], cx, cy, radius + 10));
      return !intersects;
    });
    if (worldData.layers.routes.length !== before) erasedAny = true;
  }

  // 6. Apaga Recursos
  if (worldData.layers.resources) {
    const before = worldData.layers.resources.length;
    worldData.layers.resources = worldData.layers.resources.filter(r => {
      if (!r.coords) return true;
      return !isPointInHexagon(r.coords[0], r.coords[1], cx, cy, radius + 14);
    });
    if (worldData.layers.resources.length !== before) erasedAny = true;
  }

  // 7. Apaga Células Hexagonais de Reinos
  if (worldData.layers.kingdoms) {
    worldData.layers.kingdoms.forEach(k => {
      if (k.cells) {
        const beforeCells = k.cells.length;
        k.cells = k.cells.filter(c => !isPointInHexagon(c[0], c[1], cx, cy, radius + c[2] * 0.6));
        if (k.cells.length !== beforeCells) erasedAny = true;
      }
    });
    // Remove reinos vazios
    worldData.layers.kingdoms = worldData.layers.kingdoms.filter(k => !k.cells || k.cells.length > 0);
  }

  if (erasedAny) {
    renderScene();
  }
}

// ==========================================
// 12. INSPETOR DE LORE & WORKBENCH
// ==========================================
function inspectFeature(layerKey, feat) {
  if (studioActiveTool === 'erase') {
    deleteSingleFeature(layerKey, feat.id);
    return;
  }

  selectedFeature = { layerKey, feat };

  openRightDrawerTab('paneInspector');
  const details = document.getElementById('inspectorDetails');
  if (!details) return;

  const coordsText = feat.coords ? `[${feat.coords[0]}, ${feat.coords[1]}]` : feat.center ? `[${feat.center[0]}, ${feat.center[1]}]` : 'Geometria Vetorial';

  details.innerHTML = `
    <div class="lore-card">
      <div class="lore-title">${feat.name || 'Feição Sem Nome'}</div>
      
      <div class="lore-tag-row">
        <span class="lore-tag">📂 ${layerKey}</span>
        ${feat.type ? `<span class="lore-tag">🏷️ ${feat.type}</span>` : ''}
        ${feat.era ? `<span class="lore-tag">⏳ ${feat.era}</span>` : ''}
        ${feat.lang_family ? `<span class="lore-tag">🗣️ Família ${feat.lang_family}</span>` : ''}
      </div>

      <div class="lore-text">${feat.lore || 'Esta feição ainda não possui crônica registrada no livro cartográfico.'}</div>

      <div class="lore-section">
        <div class="lore-section-title">Coordenadas & Geografia</div>
        <div>📍 Posição: <strong>${coordsText}</strong></div>
        ${feat.population ? `<div>👥 População: <strong>${feat.population.toLocaleString('pt-BR')} habitantes</strong></div>` : ''}
        ${feat.economy ? `<div>🪙 Economia: <strong>${feat.economy}</strong></div>` : ''}
        ${feat.landmarks ? `<div>🏛️ Marcos: <strong>${feat.landmarks}</strong></div>` : ''}
      </div>

      <div style="display:flex;gap:6px;margin-top:10px">
        <button class="btn" style="flex:1" id="btnEditThisFeat">✍️ Editar</button>
        <button class="btn btn-secondary" id="btnCopyThisFeat">📋 Copiar</button>
        <button class="btn btn-danger" id="btnDeleteThisFeat">🗑️</button>
      </div>
    </div>
  `;

  document.getElementById('btnEditThisFeat')?.addEventListener('click', () => openFeatureEditor(feat, layerKey));
  document.getElementById('btnCopyThisFeat')?.addEventListener('click', () => copySelected());
  document.getElementById('btnDeleteThisFeat')?.addEventListener('click', () => deleteSingleFeature(layerKey, feat.id));
}

function deleteSingleFeature(layerKey, featId) {
  if (!worldData.layers[layerKey]) return;
  recordHistorySnapshot();
  worldData.layers[layerKey] = worldData.layers[layerKey].filter(f => f.id !== featId);
  saveWorldLocally();
  renderScene();
  buildLayerMenu();
  showToast('Feição removida do mapa!', 'info');
  document.getElementById('inspectorDetails').innerHTML = `
    <div class="lore-card">
      <div class="lore-title">Feição Removida</div>
      <div class="lore-text">O elemento foi apagado das camadas cartográficas do mundo.</div>
    </div>
  `;
}

// ==========================================
// 13. EDITOR DE FEIÇÕES GIS
// ==========================================
function bindFeatureEditor() {
  document.getElementById('btnSaveFeature')?.addEventListener('click', saveFeatureFromForm);
  document.getElementById('btnClearForm')?.addEventListener('click', clearFeatureForm);
  document.getElementById('btnGenerateName')?.addEventListener('click', (e) => {
    e.preventDefault();
    const lang = document.getElementById('editLang')?.value || 'K';
    document.getElementById('editName').value = generateToponym(lang);
  });
}

function openFeatureEditor(feat = {}, layerKey = 'settlements') {
  openRightDrawerTab('paneEditor');

  document.getElementById('editFeatureId').value = feat.id || '';
  document.getElementById('editLayerKey').value = layerKey;
  document.getElementById('editName').value = feat.name || '';
  document.getElementById('editLang').value = feat.lang_family || 'K';
  document.getElementById('editEra').value = feat.era || 'Era II';
  document.getElementById('editType').value = feat.type || '';
  document.getElementById('editPop').value = feat.population || '';
  document.getElementById('editCoordX').value = feat.coords ? feat.coords[0] : (feat.center ? feat.center[0] : 500);
  document.getElementById('editCoordY').value = feat.coords ? feat.coords[1] : (feat.center ? feat.center[1] : 350);
  document.getElementById('editLore').value = feat.lore || '';
  document.getElementById('editEconomy').value = feat.economy || '';
  document.getElementById('editLandmarks').value = feat.landmarks || '';

  const btnDel = document.getElementById('btnDeleteFeature');
  if (btnDel) {
    btnDel.style.display = feat.id ? 'inline-flex' : 'none';
    btnDel.onclick = () => deleteSingleFeature(layerKey, feat.id);
  }
}

function clearFeatureForm() {
  document.getElementById('editFeatureId').value = '';
  document.getElementById('editName').value = '';
  document.getElementById('editType').value = '';
  document.getElementById('editPop').value = '';
  document.getElementById('editLore').value = '';
  document.getElementById('editEconomy').value = '';
  document.getElementById('editLandmarks').value = '';
  document.getElementById('btnDeleteFeature').style.display = 'none';
}

function saveFeatureFromForm() {
  recordHistorySnapshot();
  const layerKey = document.getElementById('editLayerKey').value;
  const featId = document.getElementById('editFeatureId').value || ('feat_' + Date.now());
  const name = document.getElementById('editName').value.trim();
  if (!name) {
    showToast('Informe o nome da feição.', 'danger');
    return;
  }

  const x = parseInt(document.getElementById('editCoordX').value, 10) || 500;
  const y = parseInt(document.getElementById('editCoordY').value, 10) || 350;

  if (!worldData.layers[layerKey]) worldData.layers[layerKey] = [];

  const existingIndex = worldData.layers[layerKey].findIndex(f => f.id === featId);
  const featObj = {
    id: featId,
    name: name,
    lang_family: document.getElementById('editLang').value,
    era: document.getElementById('editEra').value,
    type: document.getElementById('editType').value,
    population: parseInt(document.getElementById('editPop').value, 10) || undefined,
    coords: [x, y],
    lore: document.getElementById('editLore').value,
    economy: document.getElementById('editEconomy').value,
    landmarks: document.getElementById('editLandmarks').value
  };

  if (existingIndex >= 0) {
    worldData.layers[layerKey][existingIndex] = { ...worldData.layers[layerKey][existingIndex], ...featObj };
  } else {
    worldData.layers[layerKey].push(featObj);
  }

  saveWorldLocally();
  renderScene();
  buildLayerMenu();
  inspectFeature(layerKey, featObj);
  showToast(`Feição "${name}" salva com sucesso!`, 'success');
}

// ==========================================
// 14. LINHA DO TEMPO & SIMULADOR DE ERAS
// ==========================================
function bindTimeline() {
  const slider = document.getElementById('timelineSlider');
  const label = document.getElementById('timelineEraLabel');
  const titleDisp = document.getElementById('eraTitleDisplay');
  const descDisp = document.getElementById('eraDescriptionDisplay');

  const eraTexts = [
    { title: 'Visão Pan-Temporal', desc: 'Todas as feições de todas as 4 Eras Históricas estão visíveis simultaneamente no mapa.' },
    { title: 'Era I — Alvorecer das Claustras', desc: 'Populações isoladas nas 4 grandes bacias florestais fechadas e refúgios costeiros originais.' },
    { title: 'Era II — Idade do Bronze & Talassocracias', desc: 'Berço civilizacional no Golfo K, arquipélago G e primeiras rotas de navegação marítima.' },
    { title: 'Era III — Era do Ferro & Impérios de Passo', desc: 'Mineração e forjas nos planaltos boreais J; fortificações de desfiladeiros montanhosos.' },
    { title: 'Era IV — Grandes Companhias Transcontinentais', desc: 'Comércio global integrado, frotas transoceânicas e navegação de alta latitude.' }
  ];

  slider?.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    currentSelectedEra = val === 0 ? null : val;
    if (label) label.textContent = val === 0 ? 'Todas as Eras' : `Era ${['I', 'II', 'III', 'IV'][val - 1]}`;
    if (titleDisp) titleDisp.textContent = eraTexts[val].title;
    if (descDisp) descDisp.textContent = eraTexts[val].desc;

    renderScene();
  });
}

// ==========================================
// 15. EXPORTAÇÃO DE DADOS & IMAGEM
// ==========================================
function downloadWorldJson() {
  if (!worldData) return;
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(worldData, null, 2));
  const a = document.createElement('a');
  a.setAttribute('href', dataStr);
  a.setAttribute('download', `${worldData.metadata?.name || 'mapex_world'}.json`);
  document.body.appendChild(a);
  a.click();
  a.remove();
  showToast('Download do arquivo JSON iniciado.', 'success');
}

function exportMapPng() {
  const canvas = document.getElementById('terrainCanvas');
  const reliefCanvas = document.getElementById('reliefCanvas');
  if (!canvas || !reliefCanvas) return;

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = 1000;
  exportCanvas.height = 700;
  const ctx = exportCanvas.getContext('2d');

  ctx.drawImage(canvas, 0, 0);
  ctx.drawImage(reliefCanvas, 0, 0);

  const svg = document.getElementById('svgOverlay');
  const svgClone = svg.cloneNode(true);
  svgClone.querySelector('#toolCursorIndicator')?.remove();
  const svgData = new XMLSerializer().serializeToString(svgClone);

  const img = new Image();
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  img.onload = () => {
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);

    const pngUrl = exportCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.download = `${worldData.metadata?.name || 'mapex_map'}_fantasy.png`;
    a.href = pngUrl;
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('Imagem PNG exportada com sucesso!', 'success');
  };
  img.src = url;
}

// ==========================================
// 16. SISTEMA DE TOASTS
// ==========================================
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  const icon = type === 'success' ? '✅' : type === 'danger' ? '❌' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
window.showToast = showToast;

window.addEventListener('DOMContentLoaded', initMapex);
