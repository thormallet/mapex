const LAYER_CONFIG = [
  { key: 'ocean_landmask', label: '1. Mares e Costas', active: true },
  { key: 'orography', label: '2. Montanhas (Relevo 2.5D)', active: true },
  { key: 'hydrography', label: '3. Rios e Bacias', active: true },
  { key: 'biomes', label: '4. Biomas e Florestas Fechadas', active: true },
  { key: 'climates', label: '5. Climas (Köppen)', active: false },
  { key: 'macrolanguages', label: '6. Famílias Macrolinguísticas (A-M)', active: true },
  { key: 'cultures', label: '7. Culturas', active: false },
  { key: 'civilizations', label: '8. Civilizações', active: false },
  { key: 'kingdoms', label: '9. Reinos e Fronteiras', active: true },
  { key: 'settlements', label: '10. Cidades e Fortalezas', active: true },
  { key: 'routes', label: '11. Rotas Comerciais', active: true },
  { key: 'resources', label: '12. Recursos Estratégicos', active: true }
];

let worldData = null;
let panX = 0, panY = 0;
let mapex3D = null;

async function initMapex() {
  const res = await fetch('src/data/world_layers.json');
  worldData = await res.json();
  buildLayerMenu();
  bindControls();
  renderLayers();

  // Inicializa o motor 3D se Three.js estiver carregado
  if (typeof THREE !== 'undefined' && typeof Mapex3DEngine !== 'undefined') {
    mapex3D = new Mapex3DEngine({ container: document.getElementById('viewport') });
    window.mapex3D = mapex3D;
    await mapex3D.init(worldData);
  }
}

function buildLayerMenu() {
  const container = document.getElementById('layerToggles');
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
}

function updateStageTransform() {
  const tilt = document.getElementById('camTilt').value;
  const rot = document.getElementById('camRot').value;
  const zoom = document.getElementById('camZoom').value / 100;
  document.getElementById('tiltVal').textContent = tilt + '°';
  document.getElementById('rotVal').textContent = rot + '°';
  document.getElementById('zoomVal').textContent = Math.round(zoom * 100) + '%';

  const stage = document.getElementById('stage25d');
  stage.style.transform = `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) rotateX(${tilt}deg) rotateZ(${rot}deg) scale(${zoom})`;
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

  // Controles 3D (Relevo e Ciclo Solar)
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

  document.getElementById('baseMapSelect').addEventListener('change', (e) => {
    document.getElementById('rasterBase').src = e.target.value;
    if (mapex3D) mapex3D.switchBaseTexture(e.target.value);
  });

  document.getElementById('baseOpacity').addEventListener('input', (e) => {
    const v = e.target.value;
    document.getElementById('baseOpacityVal').textContent = v + '%';
    document.getElementById('rasterBase').style.opacity = v / 100;
  });

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

  // Adicionar cidade clicando com Shift + Clique no mapa 2.5D
  document.getElementById('svgOverlay').addEventListener('click', (e) => {
    if (!e.shiftKey) return;
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const cursor = pt.matrixTransform(svg.getScreenCTM().inverse());
    const name = prompt('Nome do novo assentamento/ponto:', 'Nova Cidade');
    if (!name) return;
    worldData.layers.settlements.push({
      id: 'cit_' + Date.now(),
      name,
      type: 'city',
      lang: 'K',
      coords: [Math.round(cursor.x), Math.round(cursor.y)],
      pop: 25000
    });
    buildLayerMenu();
    renderLayers();
    if (mapex3D) mapex3D.buildSettlements();
  });

  document.getElementById('exportJsonBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(worldData, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'world_layers_export.json';
    a.click();
  });

  document.getElementById('runAgentBtn').addEventListener('click', () => {
    const promptText = document.getElementById('aiPrompt').value.trim();
    if (!promptText) return;
    const agent = document.getElementById('agentSelect').value;
    inspectItem({
      title: `Comando enviado ao Gemini 3.8 Flash (${agent})`,
      details: `Agente ativo: ${agent}\nPrompt: "${promptText}"\n\nNo Antigravity, este agente já está registrado e operacional como subagente! Você pode conversar diretamente com ele no chat ou invocar com /goal ou invoke_subagent.`
    });
  });
}

function inspectItem(info) {
  document.getElementById('inspector').innerHTML = `
    <div style="color:#e9c46a;font-weight:700;margin-bottom:6px">${info.title}</div>
    <pre style="white-space:pre-wrap;font-family:inherit;color:#cbd5e1">${info.details}</pre>
  `;
}
window.inspectItem = inspectItem;
window.buildLayerMenu = buildLayerMenu;
window.renderLayers = renderLayers;

function isLayerActive(key) {
  const found = LAYER_CONFIG.find(l => l.key === key);
  return found ? found.active : false;
}

function renderLayers() {
  const svg = document.getElementById('svgOverlay');
  svg.innerHTML = '';

  // 4. BIOMAS (Florestas fechadas do Mapa 1)
  if (isLayerActive('biomes')) {
    (worldData.layers.biomes || []).forEach(b => {
      const pts = b.polygon.map(p => p.join(',')).join(' ');
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', pts);
      poly.setAttribute('fill', b.color);
      poly.setAttribute('fill-opacity', '0.38');
      poly.setAttribute('stroke', '#1b4332');
      poly.setAttribute('stroke-width', '2.5');
      poly.setAttribute('stroke-dasharray', '5,3');
      poly.style.cursor = 'pointer';
      poly.addEventListener('click', () => inspectItem({
        title: `Bioma: ${b.name}`,
        details: `Tipo: ${b.type}\nEnclave ecológico delimitado conforme o Mapa 1 (107937.jpg).`
      }));
      svg.appendChild(poly);
    });
  }

  // 3. HIDROGRAFIA (Rios principais)
  if (isLayerActive('hydrography')) {
    (worldData.layers.hydrography || []).forEach(r => {
      const d = 'M ' + r.points.map(p => p.join(' ')).join(' L ');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', '#38bdf8');
      path.setAttribute('stroke-width', r.flow === 'high' ? '3.5' : '2.2');
      path.setAttribute('stroke-linecap', 'round');
      svg.appendChild(path);
    });
  }

  // 2. OROGRAFIA (Cordilheiras com sombra 2.5D)
  if (isLayerActive('orography')) {
    (worldData.layers.orography || []).forEach(m => {
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
      path.addEventListener('click', () => inspectItem({
        title: `Cordilheira: ${m.name}`,
        details: `Altitude Média: ${m.elevation}m\nAtua como barreira climática e linguística.`
      }));
      svg.appendChild(path);
    });
  }

  // 11. ROTAS COMERCIAIS
  if (isLayerActive('routes')) {
    (worldData.layers.routes || []).forEach(rt => {
      const d = 'M ' + rt.points.map(p => p.join(' ')).join(' L ');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', rt.type === 'sea' ? '#fde047' : '#fb923c');
      path.setAttribute('stroke-width', '2.2');
      path.setAttribute('stroke-dasharray', '6,6');
      svg.appendChild(path);
    });
  }

  // 6. FAMÍLIAS MACROLINGUÍSTICAS (A até M + Zonas Híbridas)
  if (isLayerActive('macrolanguages')) {
    (worldData.layers.macrolanguages || []).forEach(lang => {
      lang.centers.forEach(c => {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'lang-node');
        g.innerHTML = `
          <circle cx="${c[0]}" cy="${c[1]}" r="${lang.isHybrid ? 16 : 22}" fill="${lang.color}" fill-opacity="0.78" stroke="#fff" stroke-width="${lang.isHybrid ? 1.5 : 2.5}" stroke-dasharray="${lang.isHybrid ? '3,2' : 'none'}" />
          <text x="${c[0]}" y="${c[1] + 4}" text-anchor="middle" fill="#0f172a" font-weight="800" font-size="11">${lang.code}</text>
        `;
        g.addEventListener('click', () => inspectItem({
          title: `${lang.code} — ${lang.name}`,
          details: `Classificação: ${lang.isHybrid ? 'Zona de Transição / Crioulização' : 'Tronco Macrolinguístico Primário'}\nCoordenadas Base: [${c[0]}, ${c[1]}]`
        }));
        svg.appendChild(g);
      });
    });
  }

  // 10. CIDADES E FORTALEZAS
  if (isLayerActive('settlements')) {
    (worldData.layers.settlements || []).forEach(s => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.style.cursor = 'pointer';
      g.innerHTML = `
        <circle cx="${s.coords[0]}" cy="${s.coords[1]}" r="6" fill="#fef08a" stroke="#000" stroke-width="2" />
        <text x="${s.coords[0] + 9}" y="${s.coords[1] + 4}" fill="#fef08a" font-size="11" font-weight="700" style="text-shadow: 0 2px 4px #000">${s.name}</text>
      `;
      g.addEventListener('click', () => inspectItem({
        title: `Assentamento: ${s.name}`,
        details: `Tipo: ${s.type}\nLíngua Predominante: ${s.lang}\nPopulação Estimada: ${s.pop.toLocaleString('pt-BR')} hab.`
      }));
      svg.appendChild(g);
    });
  }

  // 12. RECURSOS
  if (isLayerActive('resources')) {
    (worldData.layers.resources || []).forEach(res => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', res.coords[0] - 5);
      rect.setAttribute('y', res.coords[1] - 5);
      rect.setAttribute('width', '10');
      rect.setAttribute('height', '10');
      rect.setAttribute('fill', '#34d399');
      rect.setAttribute('stroke', '#064e3b');
      rect.style.cursor = 'pointer';
      rect.addEventListener('click', () => inspectItem({
        title: `Recurso: ${res.name}`,
        details: `Categoria: ${res.type}\nCoordenadas: [${res.coords[0]}, ${res.coords[1]}]`
      }));
      svg.appendChild(rect);
    });
  }
}

window.addEventListener('DOMContentLoaded', initMapex);
