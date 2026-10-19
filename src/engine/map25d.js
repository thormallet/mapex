/**
 * MAPEX 2.5D & Workbench GIS Engine
 * Coordena interface com 5 abas, renderização SVG de todas as 12 camadas,
 * controle temporal das 4 Eras Históricas e persistência de snapshots com o servidor.
 */

const LAYER_CONFIG = [
  { key: 'ocean_landmask', label: '1. Mares e Costas', active: true },
  { key: 'orography', label: '2. Montanhas (Relevo 2.5D)', active: true },
  { key: 'hydrography', label: '3. Rios e Bacias', active: true },
  { key: 'biomes', label: '4. Biomas e Florestas Fechadas', active: true },
  { key: 'climates', label: '5. Climas (Köppen)', active: true },
  { key: 'macrolanguages', label: '6. Famílias Macrolinguísticas (A-M)', active: true },
  { key: 'cultures', label: '7. Matrizes Culturais', active: true },
  { key: 'civilizations', label: '8. Berços Civilizacionais', active: true },
  { key: 'kingdoms', label: '9. Reinos e Fronteiras', active: true },
  { key: 'settlements', label: '10. Cidades e Fortalezas', active: true },
  { key: 'routes', label: '11. Rotas Comerciais', active: true },
  { key: 'resources', label: '12. Recursos Estratégicos', active: true }
];

let worldData = null;
let panX = 0, panY = 0;
let mapex3D = null;
let currentSelectedEra = null; // null = Todas as Eras, ou 1, 2, 3, 4

async function initMapex() {
  const localSaved = localStorage.getItem('mapex_world_layers_saved');

  try {
    const res = await fetch('src/data/world_layers.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    worldData = await res.json();
  } catch (err) {
    console.warn('Fetch local/file:// ativo, usando fallback integrado:', err);
    if (localSaved) {
      try {
        worldData = JSON.parse(localSaved);
        showToast('Dados restaurados do cache local (LocalStorage).', 'info');
      } catch (e) {
        worldData = JSON.parse(JSON.stringify(window.MAPEX_DEFAULT_DATA || {}));
      }
    } else if (window.MAPEX_DEFAULT_DATA) {
      worldData = JSON.parse(JSON.stringify(window.MAPEX_DEFAULT_DATA));
    } else {
      showToast('Erro ao carregar dados cartográficos.', 'danger');
      return;
    }
  }

  buildLayerMenu();
  bindControls();
  bindTabs();
  bindFeatureEditor();
  bindTimeline();
  bindSnapshots();
  renderLayers();

  // Inicializa o motor 3D Three.js
  if (typeof THREE !== 'undefined' && typeof Mapex3DEngine !== 'undefined') {
    mapex3D = new Mapex3DEngine({ container: document.getElementById('viewport') });
    window.mapex3D = mapex3D;
    await mapex3D.init(worldData);
  }
}

// ==========================================
// 1. SISTEMA DE NOTIFICAÇÕES (TOAST)
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
  }, 4000);
}
window.showToast = showToast;

// ==========================================
// 2. SISTEMA DE ABAS (WORKBENCH HUD)
// ==========================================
function bindTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      switchTab(targetId);
    });
  });

  const btnQuickAdd = document.getElementById('btnQuickAdd');
  if (btnQuickAdd) {
    btnQuickAdd.addEventListener('click', () => {
      openFeatureEditor({ coords: [500, 350] });
    });
  }

  const btnSaveTop = document.getElementById('btnSaveAllTop');
  if (btnSaveTop) {
    btnSaveTop.addEventListener('click', () => {
      saveWorldDataToServer();
    });
  }
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === tabId));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === tabId));
}

// ==========================================
// 3. MENU DE CAMADAS GIS
// ==========================================
function buildLayerMenu() {
  const container = document.getElementById('layerToggles');
  if (!container) return;
  container.innerHTML = '';
  LAYER_CONFIG.forEach(cfg => {
    const count = (worldData.layers[cfg.key] || []).length;
    const row = document.createElement('label');
    row.className = 'layer-item';
    row.innerHTML = `
      <span><input type="checkbox" data-layer="${cfg.key}" ${cfg.active ? 'checked' : ''}/> ${cfg.label}</span>
      <span class="badge">${count}</span>
    `;
    row.querySelector('input').addEventListener('change', (e) => {
      cfg.active = e.target.checked;
      renderLayers();
      if (mapex3D) mapex3D.toggleLayer(cfg.key, cfg.active);
    });
    container.appendChild(row);
  });

  const btnEnable = document.getElementById('btnEnableAllLayers');
  if (btnEnable) {
    btnEnable.onclick = () => {
      LAYER_CONFIG.forEach(c => { c.active = true; });
      buildLayerMenu();
      renderLayers();
      if (mapex3D) LAYER_CONFIG.forEach(c => mapex3D.toggleLayer(c.key, true));
    };
  }

  const btnDisable = document.getElementById('btnDisableAllLayers');
  if (btnDisable) {
    btnDisable.onclick = () => {
      LAYER_CONFIG.forEach(c => { c.active = false; });
      buildLayerMenu();
      renderLayers();
      if (mapex3D) LAYER_CONFIG.forEach(c => mapex3D.toggleLayer(c.key, false));
    };
  }
}

function isLayerActive(key) {
  const found = LAYER_CONFIG.find(l => l.key === key);
  return found ? found.active : false;
}

// ==========================================
// 4. INSPETOR DE LORE & OBJETOS
// ==========================================
function inspectAnyFeature(type, data) {
  switchTab('tab-inspector');
  const inspector = document.getElementById('inspectorContent');
  if (!inspector) return;

  const title = data.name || data.id || 'Feição Cartográfica';
  const era = data.era || 'Era II (Bronze)';
  const lang = data.lang || data.macroLang || data.code || 'Indefinida';
  const typeTag = data.type || type;
  const coords = data.coords || data.center || (data.points ? data.points[0] : [500, 350]);
  const popStr = data.pop ? `${Number(data.pop).toLocaleString('pt-BR')} habitantes` : (data.elevation ? `${data.elevation}m de altitude` : null);
  const lore = data.lore || data.description || 'Nenhuma crônica específica cadastrada para esta localidade.';
  const economy = data.economy || null;
  const landmarks = Array.isArray(data.landmarks) ? data.landmarks.join(' • ') : (data.landmarks || null);

  inspector.innerHTML = `
    <div class="lore-card">
      <div class="lore-title">${title}</div>
      <div class="lore-tag-row">
        <span class="lore-tag">Camada: ${type}</span>
        <span class="lore-tag">Era: ${era}</span>
        <span class="lore-tag">Língua: ${lang}</span>
        <span class="lore-tag">Tipo: ${typeTag}</span>
      </div>

      <div class="lore-text">${lore}</div>

      ${popStr ? `
        <div class="lore-section">
          <div class="lore-section-title">Escala / Magnitude</div>
          <div>${popStr}</div>
        </div>
      ` : ''}

      ${economy ? `
        <div class="lore-section">
          <div class="lore-section-title">Economia & Recursos</div>
          <div>${economy}</div>
        </div>
      ` : ''}

      ${landmarks ? `
        <div class="lore-section">
          <div class="lore-section-title">Marcos Históricos</div>
          <div>${landmarks}</div>
        </div>
      ` : ''}

      <div class="lore-section">
        <div class="lore-section-title">Coordenadas no Canvas (1000x700)</div>
        <div>[X: ${coords[0]}, Y: ${coords[1]}]</div>
      </div>

      <div style="margin-top:8px">
        <button class="btn btn-secondary btn-full" id="btnEditCurrent">✏️ Editar Esta Feição</button>
      </div>
    </div>
  `;

  document.getElementById('btnEditCurrent').addEventListener('click', () => {
    openFeatureEditor({ layerKey: getLayerKeyByType(type), existingFeature: data });
  });
}
window.inspectAnyFeature = inspectAnyFeature;

function getLayerKeyByType(type) {
  const map = {
    settlement: 'settlements',
    route: 'routes',
    hydrography: 'hydrography',
    river: 'hydrography',
    orography: 'orography',
    mountain: 'orography',
    biome: 'biomes',
    climate: 'climates',
    macrolanguage: 'macrolanguages',
    culture: 'cultures',
    civilization: 'civilizations',
    kingdom: 'kingdoms',
    resource: 'resources',
    ocean_landmask: 'ocean_landmask'
  };
  return map[type] || 'settlements';
}

// ==========================================
// 5. EDITOR E CONSTRUTOR DE FEIÇÕES
// ==========================================
function bindFeatureEditor() {
  const btnSave = document.getElementById('btnSaveFeature');
  const btnClear = document.getElementById('btnClearForm');
  const btnDelete = document.getElementById('btnDeleteFeature');

  if (btnSave) {
    btnSave.addEventListener('click', () => {
      saveFeatureFromForm();
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      clearFeatureForm();
    });
  }

  if (btnDelete) {
    btnDelete.addEventListener('click', () => {
      deleteCurrentFeature();
    });
  }
}

function openFeatureEditor({ coords, elevation, existingFeature, layerKey }) {
  switchTab('tab-editor');
  clearFeatureForm();

  if (existingFeature) {
    document.getElementById('editFeatureId').value = existingFeature.id || '';
    document.getElementById('editLayerKey').value = layerKey || getLayerKeyByType(existingFeature.type);
    document.getElementById('editName').value = existingFeature.name || '';
    document.getElementById('editLang').value = existingFeature.lang || existingFeature.macroLang || existingFeature.code || 'K';
    document.getElementById('editEra').value = existingFeature.era || 'Era II';
    document.getElementById('editType').value = existingFeature.type || 'city';
    document.getElementById('editPop').value = existingFeature.pop || existingFeature.elevation || '';
    
    const pt = existingFeature.coords || existingFeature.center || (existingFeature.points ? existingFeature.points[0] : [500, 350]);
    document.getElementById('editCoordX').value = pt[0];
    document.getElementById('editCoordY').value = pt[1];

    document.getElementById('editLore').value = existingFeature.lore || existingFeature.description || '';
    document.getElementById('editEconomy').value = existingFeature.economy || '';
    document.getElementById('editLandmarks').value = Array.isArray(existingFeature.landmarks) ? existingFeature.landmarks.join(', ') : (existingFeature.landmarks || '');

    document.getElementById('btnDeleteFeature').style.display = 'inline-block';
  } else if (coords) {
    document.getElementById('editCoordX').value = coords[0];
    document.getElementById('editCoordY').value = coords[1];
    document.getElementById('btnDeleteFeature').style.display = 'none';
  }
}
window.openFeatureEditor = openFeatureEditor;

function clearFeatureForm() {
  document.getElementById('editFeatureId').value = '';
  document.getElementById('editName').value = '';
  document.getElementById('editType').value = '';
  document.getElementById('editPop').value = '';
  document.getElementById('editCoordX').value = '';
  document.getElementById('editCoordY').value = '';
  document.getElementById('editLore').value = '';
  document.getElementById('editEconomy').value = '';
  document.getElementById('editLandmarks').value = '';
  document.getElementById('btnDeleteFeature').style.display = 'none';
}

function saveFeatureFromForm() {
  const layerKey = document.getElementById('editLayerKey').value;
  const name = document.getElementById('editName').value.trim();
  const lang = document.getElementById('editLang').value;
  const era = document.getElementById('editEra').value;
  const type = document.getElementById('editType').value.trim() || 'city';
  const pop = parseInt(document.getElementById('editPop').value, 10) || 25000;
  const cx = parseInt(document.getElementById('editCoordX').value, 10);
  const cy = parseInt(document.getElementById('editCoordY').value, 10);
  const lore = document.getElementById('editLore').value.trim();
  const economy = document.getElementById('editEconomy').value.trim();
  const landmarks = document.getElementById('editLandmarks').value.split(',').map(s => s.trim()).filter(Boolean);
  let id = document.getElementById('editFeatureId').value;

  if (!name || isNaN(cx) || isNaN(cy)) {
    showToast('Preencha pelo menos Nome e Coordenadas X/Y válidas.', 'danger');
    return;
  }

  if (!id) {
    id = `feat_${layerKey.substring(0, 3)}_${Date.now()}`;
  }

  if (!worldData.layers[layerKey]) {
    worldData.layers[layerKey] = [];
  }

  const list = worldData.layers[layerKey];
  const existingIdx = list.findIndex(f => f.id === id);

  const newObj = {
    id,
    name,
    type,
    era,
    lang,
    lore
  };

  if (economy) newObj.economy = economy;
  if (landmarks.length > 0) newObj.landmarks = landmarks;

  if (layerKey === 'settlements' || layerKey === 'resources') {
    newObj.coords = [cx, cy];
    if (layerKey === 'settlements') newObj.pop = pop;
  } else if (layerKey === 'kingdoms' || layerKey === 'civilizations' || layerKey === 'climates' || layerKey === 'cultures') {
    newObj.center = [cx, cy];
    if (layerKey === 'kingdoms') newObj.capital = name;
  } else if (layerKey === 'macrolanguages') {
    newObj.code = lang;
    newObj.centers = [[cx, cy]];
  } else if (layerKey === 'hydrography' || layerKey === 'orography' || layerKey === 'routes') {
    newObj.points = [[cx, cy], [cx + 30, cy + 20], [cx + 60, cy + 45]];
  }

  if (existingIdx >= 0) {
    list[existingIdx] = Object.assign({}, list[existingIdx], newObj);
    showToast(`Feição "${name}" atualizada com sucesso!`);
  } else {
    list.push(newObj);
    showToast(`Nova feição "${name}" criada na camada ${layerKey}!`);
  }

  buildLayerMenu();
  renderLayers();
  if (mapex3D) mapex3D.rebuildAllLayers();
  inspectAnyFeature(layerKey, newObj);
}

function deleteCurrentFeature() {
  const id = document.getElementById('editFeatureId').value;
  const layerKey = document.getElementById('editLayerKey').value;
  if (!id || !confirm('Tem certeza que deseja excluir esta feição do mundo?')) return;

  if (worldData.layers[layerKey]) {
    worldData.layers[layerKey] = worldData.layers[layerKey].filter(f => f.id !== id);
    buildLayerMenu();
    renderLayers();
    if (mapex3D) mapex3D.rebuildAllLayers();
    showToast('Feição excluída com sucesso.');
    clearFeatureForm();
    switchTab('tab-inspector');
  }
}

// ==========================================
// 6. LINHA DO TEMPO & ERAS HISTÓRICAS
// ==========================================
const ERA_INFO = {
  all: {
    title: 'Visão Pan-Temporal (Todas as Eras)',
    desc: 'O mapa exibe simultaneamente todas as cidades, reinos, rotas e civilizações de todas as quatro grandes eras históricas.'
  },
  1: {
    title: 'Era I — Alvorecer das Claustras (Neolítico / Calcolítico)',
    desc: 'Isolamento das populações proto-linguísticas nas 4 grandes bacias florestais fechadas (E, E/L, F/A) e refúgios insulares (B, M).'
  },
  2: {
    title: 'Era II — Idade do Bronze & Talassocracias do Golfo',
    desc: 'Ascensão do Berço Civilizacional de K no Golfo Interno, expansão marítima de G no arquipélago ocidental (enclave G/K) e travessia do estreito oriental por A.'
  },
  3: {
    title: 'Era III — Era do Ferro & Impérios de Passo',
    desc: 'Domínio da metalurgia na Cadeia Boreal (J) e fortificação militar dos passos da Grande Cordilheira Meridional entre K, E e os principados da costa C.'
  },
  4: {
    title: 'Era IV — Grandes Companhias e Rotas Transcontinentais',
    desc: 'Integração comercial global plena, frotas armadas de longo curso e postos comerciais de navegação boreal nos estreitos árticos (H/I, I/J, I/J/L).'
  }
};

function bindTimeline() {
  // Pílulas no topo do HUD
  const pills = document.querySelectorAll('.era-pill');
  pills.forEach(p => {
    p.addEventListener('click', () => {
      const eraVal = p.getAttribute('data-era');
      setTimelineEra(eraVal === 'all' ? null : parseInt(eraVal, 10));
    });
  });

  // Slider na aba Linha do Tempo
  const slider = document.getElementById('timelineSlider');
  if (slider) {
    slider.addEventListener('input', (e) => {
      const v = parseInt(e.target.value, 10);
      setTimelineEra(v === 0 ? null : v);
    });
  }
}

function setTimelineEra(eraNum) {
  currentSelectedEra = eraNum;

  // Atualiza pílulas
  document.querySelectorAll('.era-pill').forEach(p => {
    const eraVal = p.getAttribute('data-era');
    if (!eraNum && eraVal === 'all') p.classList.add('active');
    else if (eraNum && parseInt(eraVal, 10) === eraNum) p.classList.add('active');
    else p.classList.remove('active');
  });

  // Atualiza slider
  const slider = document.getElementById('timelineSlider');
  if (slider) slider.value = eraNum || 0;

  // Atualiza cards de texto
  const info = ERA_INFO[eraNum || 'all'];
  const lbl = document.getElementById('timelineEraLabel');
  if (lbl) lbl.textContent = eraNum ? `Era ${eraNum}` : 'Todas as Eras';
  const tDisp = document.getElementById('eraTitleDisplay');
  if (tDisp) tDisp.textContent = info.title;
  const dDisp = document.getElementById('eraDescriptionDisplay');
  if (dDisp) dDisp.textContent = info.desc;

  // Filtra mapa 2.5D e 3D
  renderLayers();
  if (mapex3D) mapex3D.setEra(eraNum);
}

function isFeatureActiveInEra(item) {
  if (!currentSelectedEra) return true;
  const eraStr = item.era || 'Era II';
  let featEraNum = 2;
  if (eraStr.includes('I') && !eraStr.includes('II') && !eraStr.includes('IV')) featEraNum = 1;
  else if (eraStr.includes('II') && !eraStr.includes('III')) featEraNum = 2;
  else if (eraStr.includes('III')) featEraNum = 3;
  else if (eraStr.includes('IV')) featEraNum = 4;

  return featEraNum <= currentSelectedEra;
}

// ==========================================
// 7. PERSISTÊNCIA, SERVIDOR & SNAPSHOTS
// ==========================================
function bindSnapshots() {
  const btnSave = document.getElementById('btnSaveLayersServer');
  if (btnSave) {
    btnSave.addEventListener('click', saveWorldDataToServer);
  }

  const btnRefresh = document.getElementById('btnRefreshSnapshots');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', loadSnapshotsList);
  }

  const btnRestore = document.getElementById('btnRestoreSnapshot');
  if (btnRestore) {
    btnRestore.addEventListener('click', restoreSelectedSnapshot);
  }

  const btnExport = document.getElementById('exportJsonBtn');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(worldData, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `world_layers_${Date.now()}.json`;
      a.click();
    });
  }

  const fileInput = document.getElementById('importJsonInput');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          if (!parsed.metadata || !parsed.layers) throw new Error('Estrutura de dados inválida.');
          worldData = parsed;
          buildLayerMenu();
          renderLayers();
          if (mapex3D) mapex3D.rebuildAllLayers();
          showToast('JSON importado com sucesso na memória!');
        } catch (err) {
          showToast('Erro ao importar JSON: ' + err.message, 'danger');
        }
      };
      reader.readAsText(file);
    });
  }

  const btnGemini = document.getElementById('runAgentBtn');
  if (btnGemini) {
    btnGemini.addEventListener('click', () => {
      const promptText = document.getElementById('aiPrompt').value.trim();
      if (!promptText) {
        showToast('Digite uma instrução para o Gemini.', 'info');
        return;
      }
      showToast('Comando enviado ao Gemini 3.8 Flash! Use invoke_subagent ou o chat do Antigravity para geração direta.', 'success');
      inspectAnyFeature('gemini_request', {
        name: 'Solicitação ao Gemini 3.8 Flash',
        era: 'Era II',
        type: 'AI Generation Brief',
        description: `Prompt recebido: "${promptText}".\n\nNo ecossistema Mapex do Antigravity, você pode invocar o subagente correspondente no chat ou deixar que o Mapex Orchestrator execute e popule o mapa automaticamente.`
      });
    });
  }

  loadSnapshotsList();
}

async function saveWorldDataToServer() {
  try {
    const res = await fetch('/api/layers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(worldData)
    });
    const result = await res.json();
    if (result.ok) {
      showToast(`Salvo no disco! Snapshot: ${result.snapshot}`, 'success');
      loadSnapshotsList();
      return;
    }
  } catch (err) {
    localStorage.setItem('mapex_world_layers_saved', JSON.stringify(worldData));
    showToast('Salvo no cache do navegador (LocalStorage)! Use "Baixar JSON" para salvar em arquivo.', 'info');
  }
}

async function loadSnapshotsList() {
  const sel = document.getElementById('snapshotSelect');
  if (!sel) return;
  try {
    const res = await fetch('/api/snapshots');
    const result = await res.json();
    if (result.ok && Array.isArray(result.snapshots)) {
      sel.innerHTML = '';
      if (result.snapshots.length === 0) {
        sel.innerHTML = '<option value="">Nenhum snapshot em saves/ ainda</option>';
        return;
      }
      result.snapshots.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.filename;
        const d = new Date(s.createdAt);
        opt.textContent = `${s.filename} (${(s.size / 1024).toFixed(1)} KB — ${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR')})`;
        sel.appendChild(opt);
      });
    }
  } catch (err) {
    sel.innerHTML = '<option value="">Erro ao buscar snapshots</option>';
  }
}

async function restoreSelectedSnapshot() {
  const sel = document.getElementById('snapshotSelect');
  if (!sel || !sel.value) return;
  const filename = sel.value;
  if (!confirm(`Deseja restaurar o snapshot "${filename}"? As alterações não salvas serão substituídas.`)) return;

  try {
    const res = await fetch('/api/snapshots/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename })
    });
    const result = await res.json();
    if (result.ok) {
      worldData = result.data;
      buildLayerMenu();
      renderLayers();
      if (mapex3D) mapex3D.rebuildAllLayers();
      showToast(result.message, 'success');
    } else {
      showToast(`Falha ao restaurar: ${result.error}`, 'danger');
    }
  } catch (err) {
    showToast(`Erro na requisição: ${err.message}`, 'danger');
  }
}

// ==========================================
// 8. RENDERIZAÇÃO SVG DAS 12 CAMADAS (2.5D)
// ==========================================
function renderLayers() {
  const svg = document.getElementById('svgOverlay');
  if (!svg || !worldData || !worldData.layers) return;
  svg.innerHTML = '';

  // 1. MARES, COSTAS E MAR INTERNO
  if (isLayerActive('ocean_landmask')) {
    (worldData.layers.ocean_landmask || []).forEach(geo => {
      if (!geo.polygon) return;
      const pts = geo.polygon.map(p => p.join(',')).join(' ');
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', pts);
      if (geo.type === 'inland_sea') {
        poly.setAttribute('fill', '#0284c7');
        poly.setAttribute('fill-opacity', '0.22');
        poly.setAttribute('stroke', '#38bdf8');
        poly.setAttribute('stroke-width', '2');
        poly.setAttribute('stroke-dasharray', '4,2');
      } else {
        poly.setAttribute('fill', 'none');
        poly.setAttribute('stroke', '#d4a373');
        poly.setAttribute('stroke-width', '1.5');
        poly.setAttribute('stroke-opacity', '0.6');
      }
      poly.style.cursor = 'pointer';
      poly.addEventListener('click', () => inspectAnyFeature('ocean_landmask', geo));
      svg.appendChild(poly);
    });
  }

  // 5. CLIMAS KÖPPEN (Polígonos/Faixas Bioclimáticas)
  if (isLayerActive('climates')) {
    (worldData.layers.climates || []).forEach(clim => {
      const center = clim.center || [500, 350];
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.style.cursor = 'pointer';
      g.innerHTML = `
        <ellipse cx="${center[0]}" cy="${center[1]}" rx="65" ry="38" fill="${clim.color || '#f4a261'}" fill-opacity="0.18" stroke="${clim.color || '#f4a261'}" stroke-width="1.8" stroke-dasharray="4,3" />
        <text x="${center[0]}" y="${center[1] + 4}" fill="${clim.color || '#f4a261'}" font-size="11" font-weight="800" text-anchor="middle">${clim.koppen || 'Clima'}</text>
      `;
      g.addEventListener('click', () => inspectAnyFeature('climate', clim));
      svg.appendChild(g);
    });
  }

  // 4. BIOMAS E FLORESTAS FECHADAS
  if (isLayerActive('biomes')) {
    (worldData.layers.biomes || []).forEach(b => {
      if (!b.polygon) return;
      const pts = b.polygon.map(p => p.join(',')).join(' ');
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', pts);
      poly.setAttribute('fill', b.color || '#2d6a4f');
      poly.setAttribute('fill-opacity', '0.38');
      poly.setAttribute('stroke', '#1b4332');
      poly.setAttribute('stroke-width', '2.5');
      poly.setAttribute('stroke-dasharray', '5,3');
      poly.style.cursor = 'pointer';
      poly.addEventListener('click', () => inspectAnyFeature('biome', b));
      svg.appendChild(poly);
    });
  }

  // 3. HIDROGRAFIA (Rios Principais)
  if (isLayerActive('hydrography')) {
    (worldData.layers.hydrography || []).forEach(r => {
      if (!r.points || r.points.length < 2) return;
      const d = 'M ' + r.points.map(p => p.join(' ')).join(' L ');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', '#38bdf8');
      path.setAttribute('stroke-width', r.flow === 'high' ? '3.5' : '2.2');
      path.setAttribute('stroke-linecap', 'round');
      path.style.cursor = 'pointer';
      path.addEventListener('click', () => inspectAnyFeature('hydrography', r));
      svg.appendChild(path);
    });
  }

  // 2. OROGRAFIA (Cordilheiras e Cristas)
  if (isLayerActive('orography')) {
    (worldData.layers.orography || []).forEach(m => {
      if (!m.points || m.points.length < 2) return;
      const d = 'M ' + m.points.map(p => p.join(' ')).join(' L ');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', '#f59e0b');
      path.setAttribute('stroke-width', '5');
      path.setAttribute('stroke-dasharray', '2,8');
      path.setAttribute('stroke-linecap', 'round');
      path.style.filter = 'drop-shadow(0px -6px 4px rgba(0,0,0,0.75))';
      path.style.cursor = 'pointer';
      path.addEventListener('click', () => inspectAnyFeature('orography', m));
      svg.appendChild(path);
    });
  }

  // 9. REINOS E FRONTEIRAS
  if (isLayerActive('kingdoms')) {
    (worldData.layers.kingdoms || []).forEach(kng => {
      if (!isFeatureActiveInEra(kng)) return;
      const center = kng.center || [500, 350];
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.style.cursor = 'pointer';
      g.innerHTML = `
        <circle cx="${center[0]}" cy="${center[1]}" r="42" fill="${kng.color || '#d62828'}" fill-opacity="0.12" stroke="${kng.color || '#d62828'}" stroke-width="2" stroke-dasharray="6,4" />
        <circle cx="${center[0]}" cy="${center[1]}" r="6" fill="${kng.color || '#d62828'}" stroke="#fff" stroke-width="1.5" />
        <text x="${center[0] + 10}" y="${center[1] + 4}" fill="${kng.color || '#d62828'}" font-size="11" font-weight="800" style="text-shadow: 0 2px 4px #000">👑 ${kng.name}</text>
      `;
      g.addEventListener('click', () => inspectAnyFeature('kingdom', kng));
      svg.appendChild(g);
    });
  }

  // 8. CIVILIZAÇÕES ANTIGAS
  if (isLayerActive('civilizations')) {
    (worldData.layers.civilizations || []).forEach(civ => {
      if (!isFeatureActiveInEra(civ)) return;
      const center = civ.center || [500, 350];
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.style.cursor = 'pointer';
      g.innerHTML = `
        <polygon points="${center[0]},${center[1]-12} ${center[0]+10},${center[1]+8} ${center[0]-10},${center[1]+8}" fill="#94a3b8" stroke="#f8fafc" stroke-width="1.5" />
        <text x="${center[0] + 14}" y="${center[1] + 4}" fill="#cbd5e1" font-size="10" font-weight="700">🏛️ ${civ.name}</text>
      `;
      g.addEventListener('click', () => inspectAnyFeature('civilization', civ));
      svg.appendChild(g);
    });
  }

  // 7. CULTURAS
  if (isLayerActive('cultures')) {
    (worldData.layers.cultures || []).forEach(cult => {
      const center = cult.center || [500, 350];
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.style.cursor = 'pointer';
      g.innerHTML = `
        <rect x="${center[0]-7}" y="${center[1]-7}" width="14" height="14" rx="3" fill="#38bdf8" fill-opacity="0.8" stroke="#fff" stroke-width="1.5" transform="rotate(45 ${center[0]} ${center[1]})" />
        <text x="${center[0] + 12}" y="${center[1] + 4}" fill="#7dd3fc" font-size="10" font-weight="700">🎭 ${cult.name}</text>
      `;
      g.addEventListener('click', () => inspectAnyFeature('culture', cult));
      svg.appendChild(g);
    });
  }

  // 11. ROTAS COMERCIAIS
  if (isLayerActive('routes')) {
    (worldData.layers.routes || []).forEach(rt => {
      if (!isFeatureActiveInEra(rt) || !rt.points || rt.points.length < 2) return;
      const d = 'M ' + rt.points.map(p => p.join(' ')).join(' L ');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', rt.type === 'sea' ? '#fde047' : '#fb923c');
      path.setAttribute('stroke-width', '2.4');
      path.setAttribute('stroke-dasharray', '6,6');
      path.style.cursor = 'pointer';
      path.addEventListener('click', () => inspectAnyFeature('route', rt));
      svg.appendChild(path);
    });
  }

  // 6. FAMÍLIAS MACROLINGUÍSTICAS (A até M + Híbridas)
  if (isLayerActive('macrolanguages')) {
    (worldData.layers.macrolanguages || []).forEach(lang => {
      (lang.centers || []).forEach(c => {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.style.cursor = 'pointer';
        g.innerHTML = `
          <circle cx="${c[0]}" cy="${c[1]}" r="${lang.isHybrid ? 16 : 22}" fill="${lang.color || '#e2e8f0'}" fill-opacity="0.82" stroke="#fff" stroke-width="${lang.isHybrid ? 1.5 : 2.5}" stroke-dasharray="${lang.isHybrid ? '3,2' : 'none'}" />
          <text x="${c[0]}" y="${c[1] + 4}" text-anchor="middle" fill="#0f172a" font-weight="800" font-size="11">${lang.code}</text>
        `;
        g.addEventListener('click', () => inspectAnyFeature('macrolanguage', lang));
        svg.appendChild(g);
      });
    });
  }

  // 10. CIDADES E ASSENTAMENTOS
  if (isLayerActive('settlements')) {
    (worldData.layers.settlements || []).forEach(s => {
      if (!isFeatureActiveInEra(s) || !s.coords) return;
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.style.cursor = 'pointer';
      g.innerHTML = `
        <circle cx="${s.coords[0]}" cy="${s.coords[1]}" r="6.5" fill="#fef08a" stroke="#000" stroke-width="2" />
        <circle cx="${s.coords[0]}" cy="${s.coords[1]}" r="2.5" fill="#d97706" />
        <text x="${s.coords[0] + 10}" y="${s.coords[1] + 4}" fill="#fef08a" font-size="11" font-weight="700" style="text-shadow: 0 2px 4px #000">${s.name}</text>
      `;
      g.addEventListener('click', () => inspectAnyFeature('settlement', s));
      svg.appendChild(g);
    });
  }

  // 12. RECURSOS ESTRATÉGICOS
  if (isLayerActive('resources')) {
    (worldData.layers.resources || []).forEach(res => {
      if (!res.coords) return;
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.style.cursor = 'pointer';
      g.innerHTML = `
        <rect x="${res.coords[0] - 6}" y="${res.coords[1] - 6}" width="12" height="12" rx="2" fill="#34d399" stroke="#064e3b" stroke-width="1.8" />
        <text x="${res.coords[0] + 9}" y="${res.coords[1] + 4}" fill="#a7f3d0" font-size="9" font-weight="700" style="text-shadow: 0 2px 3px #000">${res.name}</text>
      `;
      g.addEventListener('click', () => inspectAnyFeature('resource', res));
      svg.appendChild(g);
    });
  }
}
window.renderLayers = renderLayers;

// ==========================================
// 9. CONTROLES DE CÂMERA & NAVEGAÇÃO 2.5D
// ==========================================
function updateStageTransform() {
  const tilt = document.getElementById('camTilt').value;
  const rot = document.getElementById('camRot').value;
  const zoom = document.getElementById('camZoom').value / 100;
  document.getElementById('tiltVal').textContent = tilt + '°';
  document.getElementById('rotVal').textContent = rot + '°';
  document.getElementById('zoomVal').textContent = Math.round(zoom * 100) + '%';

  const stage = document.getElementById('stage25d');
  if (stage) {
    stage.style.transform = `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) rotateX(${tilt}deg) rotateZ(${rot}deg) scale(${zoom})`;
  }
}

function bindControls() {
  // Seletor de Modo 3D vs 2.5D
  const viewModeSelect = document.getElementById('viewModeSelect');
  if (viewModeSelect) {
    viewModeSelect.addEventListener('change', (e) => {
      const mode = e.target.value;
      const stage25d = document.getElementById('stage25d');
      const canvas3d = document.getElementById('threeCanvas');
      const controls3D = document.getElementById('controls3D');
      const controls25D = document.getElementById('controls25D');
      const hud3DHint = document.getElementById('hud3DHint');

      if (mode === '3d') {
        if (stage25d) stage25d.style.display = 'none';
        if (canvas3d) canvas3d.style.display = 'block';
        if (controls3D) controls3D.style.display = 'block';
        if (controls25D) controls25D.style.display = 'none';
        if (hud3DHint) hud3DHint.style.display = 'flex';
      } else {
        if (stage25d) stage25d.style.display = 'block';
        if (canvas3d) canvas3d.style.display = 'none';
        if (controls3D) controls3D.style.display = 'none';
        if (controls25D) controls25D.style.display = 'block';
        if (hud3DHint) hud3DHint.style.display = 'none';
        updateStageTransform();
      }
    });
  }

  // Controles 3D
  const reliefInput = document.getElementById('reliefExaggeration');
  if (reliefInput) {
    reliefInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      document.getElementById('reliefVal').textContent = val + '%';
      if (mapex3D) mapex3D.setReliefExaggeration(val / 100);
    });
  }

  const sunInput = document.getElementById('sunCycle');
  if (sunInput) {
    sunInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      let label = 'Alvorecer';
      if (val >= 25 && val < 60) label = 'Meio-Dia Solar';
      else if (val >= 60 && val < 85) label = 'Poente Dourado';
      else if (val >= 85 || val < 10) label = 'Luz Noturna';
      document.getElementById('sunVal').textContent = label;
      if (mapex3D) mapex3D.setSunTime(val);
    });
  }

  // Controles 2.5D
  ['camTilt', 'camRot', 'camZoom'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateStageTransform);
  });

  const baseSelect = document.getElementById('baseMapSelect');
  if (baseSelect) {
    baseSelect.addEventListener('change', (e) => {
      const raster = document.getElementById('rasterBase');
      if (raster) raster.src = e.target.value;
      if (mapex3D) mapex3D.switchBaseTexture(e.target.value);
    });
  }

  const baseOp = document.getElementById('baseOpacity');
  if (baseOp) {
    baseOp.addEventListener('input', (e) => {
      const v = e.target.value;
      document.getElementById('baseOpacityVal').textContent = v + '%';
      const raster = document.getElementById('rasterBase');
      if (raster) raster.style.opacity = v / 100;
    });
  }

  // Drag para pan no viewport 2.5D
  const vp = document.getElementById('viewport');
  let dragging = false, startX = 0, startY = 0;
  vp.addEventListener('mousedown', (e) => {
    if (document.getElementById('viewModeSelect')?.value === '3d') return;
    dragging = true; startX = e.clientX - panX; startY = e.clientY - panY;
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging || document.getElementById('viewModeSelect')?.value === '3d') return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    updateStageTransform();
  });
  window.addEventListener('mouseup', () => dragging = false);

  // Adicionar feição clicando com Shift + Clique no mapa 2.5D
  const svg = document.getElementById('svgOverlay');
  if (svg) {
    svg.addEventListener('click', (e) => {
      if (!e.shiftKey) return;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      const cursor = pt.matrixTransform(svg.getScreenCTM().inverse());
      openFeatureEditor({ coords: [Math.round(cursor.x), Math.round(cursor.y)] });
    });
  }
}

window.addEventListener('DOMContentLoaded', initMapex);
