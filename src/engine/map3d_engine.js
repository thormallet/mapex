/**
 * MAPEX 3D Engine — Renderizador Tridimensional com Preservação Raster & Worldbuilding GIS
 * Utiliza Three.js com elevação orográfica de terreno, iluminação solar dinâmica,
 * paridade para todas as 12 camadas, suporte a 4 Eras Históricas e interação sem window.prompt.
 */

class Mapex3DEngine {
  constructor(options = {}) {
    this.container = options.container || document.getElementById('viewport');
    this.worldData = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.terrainMesh = null;
    this.terrainGeo = null;
    this.baseHeights = null;
    this.textureLoader = null;
    this.activeTexture = null;
    this.reliefExaggeration = 1.35;
    this.currentEra = null; // null = Todas as Eras, ou 1, 2, 3, 4
    
    // Grupos para todas as 12 camadas do Mapex + auxiliares
    this.groups = {
      terrain: new THREE.Group(),
      ocean_landmask: new THREE.Group(),
      orography: new THREE.Group(),
      hydrography: new THREE.Group(),
      biomes: new THREE.Group(),
      climates: new THREE.Group(),
      macrolanguages: new THREE.Group(),
      cultures: new THREE.Group(),
      civilizations: new THREE.Group(),
      kingdoms: new THREE.Group(),
      settlements: new THREE.Group(),
      routes: new THREE.Group(),
      resources: new THREE.Group(),
      decorations: new THREE.Group()
    };
    
    // Iluminação
    this.sunLight = null;
    this.ambientLight = null;
    this.sunAngle = 0.85; // radianos
    
    // Raycaster e interação
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.mouseDownPos = new THREE.Vector2();
    this.interactiveObjects = [];
    this.hoveredObject = null;
    
    // Animação de rotas e partículas
    this.routeCaravans = [];
    this.clock = new THREE.Clock();
  }

  async init(worldData) {
    this.worldData = worldData;
    this.textureLoader = new THREE.TextureLoader();

    // 1. Inicializa cena Three.js
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e17);
    this.scene.fog = new THREE.FogExp2(0x0a0e17, 0.0035);

    // 2. Configura câmera
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 2500);
    this.camera.position.set(0, 75, 95);

    // 3. Renderer WebGL
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.domElement.id = 'threeCanvas';
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.inset = '0';
    this.renderer.domElement.style.zIndex = '2';
    this.container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI / 2.08; // impede passar debaixo da mesa
    this.controls.minDistance = 15;
    this.controls.maxDistance = 280;
    this.controls.target.set(0, 0, 0);

    // 5. Adiciona grupos à cena
    Object.values(this.groups).forEach(g => this.scene.add(g));

    // 6. Monta iluminação ambiente e solar
    this.setupLighting();

    // 7. Constrói o terreno 3D baseado no mapa raster original
    await this.buildTerrain();

    // 8. Constrói todas as feições 3D (Paridade 12 Camadas)
    this.rebuildAllLayers();

    // 9. Eventos de mouse e redimensionamento
    this.bindEvents();

    // 10. Loop de renderização
    this.animate();
  }

  setupLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffecd1, 0.65);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfff3d6, 1.45);
    this.updateSunPosition();
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 400;
    this.sunLight.shadow.camera.left = -70;
    this.sunLight.shadow.camera.right = 70;
    this.sunLight.shadow.camera.top = 55;
    this.sunLight.shadow.camera.bottom = -55;
    this.sunLight.shadow.bias = -0.0004;
    this.scene.add(this.sunLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.35);
    fillLight.position.set(-80, 50, -80);
    this.scene.add(fillLight);
  }

  updateSunPosition() {
    const radius = 120;
    const x = Math.cos(this.sunAngle) * radius;
    const z = Math.sin(this.sunAngle) * radius;
    const y = 85;
    this.sunLight.position.set(x, y, z);
  }

  setSunTime(value) {
    this.sunAngle = (value / 100) * Math.PI * 2;
    this.updateSunPosition();
  }

  mapToWorldCoords(px, py) {
    const worldW = 100;
    const worldH = 70;
    const wx = ((px - 500) / 1000) * worldW;
    const wz = ((py - 350) / 700) * worldH;
    const wy = this.getTerrainHeightAt(wx, wz);
    return new THREE.Vector3(wx, wy, wz);
  }

  worldToMapCoords(wx, wz) {
    const worldW = 100;
    const worldH = 70;
    const px = (wx / worldW) * 1000 + 500;
    const py = (wz / worldH) * 700 + 350;
    return [Math.round(px), Math.round(py)];
  }

  generateOrographyHeightmap() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 358;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const orography = this.worldData.layers.orography || [];
    orography.forEach(m => {
      if (!m.points || m.points.length < 2) return;
      const intensity = Math.min(255, Math.round(((m.elevation || 3500) / 4600) * 230));
      const hex = intensity.toString(16).padStart(2, '0');

      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = `#${hex}${hex}${hex}`;
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = `#${hex}${hex}${hex}`;
      ctx.shadowBlur = 18;

      m.points.forEach((pt, idx) => {
        const cx = (pt[0] / 1000) * canvas.width;
        const cy = (pt[1] / 700) * canvas.height;
        if (idx === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();

      ctx.lineWidth = 4;
      ctx.shadowBlur = 4;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.restore();
    });

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  loadHeightmapData() {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(ctx.getImageData(0, 0, img.width, img.height));
      };
      img.onerror = () => {
        resolve(this.generateOrographyHeightmap());
      };
      img.src = 'assets/styled_maps/mapex_heightmap.png';
    });
  }

  async buildTerrain() {
    const worldW = 100;
    const worldH = 70;
    const segX = 200;
    const segY = 140;

    this.terrainGeo = new THREE.PlaneGeometry(worldW, worldH, segX, segY);
    this.terrainGeo.rotateX(-Math.PI / 2);

    const heightData = await this.loadHeightmapData();
    const pos = this.terrainGeo.attributes.position;
    this.baseHeights = new Float32Array(pos.count);

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);

      const u = (vx / worldW) + 0.5;
      const v = (vz / worldH) + 0.5;
      const px = Math.floor(Math.max(0, Math.min(1, u)) * (heightData.width - 1));
      const py = Math.floor(Math.max(0, Math.min(1, v)) * (heightData.height - 1));
      const pIdx = (py * heightData.width + px) * 4;

      const rawVal = heightData.data[pIdx] / 255.0;
      const elevation = Math.pow(rawVal, 1.45) * 6.5;
      this.baseHeights[i] = elevation;
      pos.setY(i, elevation * this.reliefExaggeration);
    }

    this.terrainGeo.computeVertexNormals();

    const currentBaseMap = document.getElementById('baseMapSelect') ? document.getElementById('baseMapSelect').value : 'assets/styled_maps/mapex_kosmos_physical.png';
    this.activeTexture = await this.loadTextureAsync(currentBaseMap);
    this.activeTexture.anisotropy = 8;

    const terrainMat = new THREE.MeshStandardMaterial({
      map: this.activeTexture,
      roughness: 0.72,
      metalness: 0.08,
      bumpScale: 0.25,
      flatShading: false
    });

    this.terrainMesh = new THREE.Mesh(this.terrainGeo, terrainMat);
    this.terrainMesh.receiveShadow = true;
    this.terrainMesh.castShadow = true;
    this.groups.terrain.add(this.terrainMesh);

    this.buildFramedBorder(worldW, worldH);
    this.buildOceanWater(worldW, worldH);
    this.buildDecorations();
  }

  buildFramedBorder(worldW, worldH) {
    const borderThick = 2.5;
    const borderHeight = 2.0;
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1b130e,
      roughness: 0.5,
      metalness: 0.35
    });

    const frameGeo = new THREE.BoxGeometry(worldW + borderThick * 2, borderHeight, worldH + borderThick * 2);
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.position.set(0, -borderHeight / 2 - 0.1, 0);
    frameMesh.receiveShadow = true;
    this.groups.terrain.add(frameMesh);
  }

  buildOceanWater(worldW, worldH) {
    const waterGeo = new THREE.PlaneGeometry(worldW, worldH);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x092b3d,
      roughness: 0.15,
      metalness: 0.85,
      transparent: true,
      opacity: 0.28
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = 0.08;
    this.groups.terrain.add(waterMesh);
  }

  getTerrainHeightAt(wx, wz) {
    if (!this.terrainGeo) return 0;
    const worldW = 100;
    const worldH = 70;
    const segX = 200;
    const segY = 140;

    const u = Math.max(0, Math.min(1, (wx / worldW) + 0.5));
    const v = Math.max(0, Math.min(1, (wz / worldH) + 0.5));

    const col = Math.floor(u * segX);
    const row = Math.floor(v * segY);
    const idx = row * (segX + 1) + col;

    if (this.baseHeights && idx >= 0 && idx < this.baseHeights.length) {
      return this.baseHeights[idx] * this.reliefExaggeration;
    }
    return 0;
  }

  setReliefExaggeration(val) {
    this.reliefExaggeration = val;
    if (!this.terrainGeo || !this.baseHeights) return;
    const pos = this.terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, this.baseHeights[i] * this.reliefExaggeration);
    }
    pos.needsUpdate = true;
    this.terrainGeo.computeVertexNormals();

    this.repositionElementsOnRelief();
  }

  repositionElementsOnRelief() {
    this.rebuildAllLayers();
  }

  async switchBaseTexture(url) {
    const tex = await this.loadTextureAsync(url);
    tex.anisotropy = 8;
    if (this.terrainMesh) {
      this.terrainMesh.material.map = tex;
      this.terrainMesh.material.needsUpdate = true;
      this.activeTexture = tex;
    }
  }

  loadTextureAsync(url) {
    return new Promise((resolve) => {
      this.textureLoader.load(url, (tex) => resolve(tex), undefined, () => {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 358;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#22303e'; ctx.fillRect(0,0,512,358);
        ctx.fillStyle = '#e9c46a'; ctx.font = '24px serif';
        ctx.fillText('Mapex Base Map', 150, 180);
        resolve(new THREE.CanvasTexture(canvas));
      });
    });
  }

  rebuildAllLayers() {
    this.interactiveObjects = [];
    this.buildSettlements();
    this.buildRoutes();
    this.buildMacrolanguages();
    this.buildBiomeEnclaves();
    this.buildHydrography();
    this.buildOrography();
    this.buildResources();
    this.buildKingdoms();
    this.buildCivilizations();
    this.buildCultures();
    this.buildClimates();
    this.buildOceanLandmask();
    this.applyEraFiltering();
  }

  /**
   * 1. ASSENTAMENTOS E CIDADES (Torres 3D com Beacons)
   */
  buildSettlements() {
    this.clearGroup(this.groups.settlements);
    const settlements = this.worldData.layers.settlements || [];

    const towerGeo = new THREE.CylinderGeometry(0.2, 0.45, 1.8, 6);
    const spireGeo = new THREE.ConeGeometry(0.25, 0.9, 6);
    spireGeo.translate(0, 1.35, 0);

    const bronzeMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, metalness: 0.85, roughness: 0.25 });
    const beaconGeo = new THREE.SphereGeometry(0.26, 12, 12);
    const beaconMat = new THREE.MeshStandardMaterial({ color: 0xffe066, emissive: 0xffaa00, emissiveIntensity: 0.9 });

    settlements.forEach(s => {
      const pos = this.mapToWorldCoords(s.coords[0], s.coords[1]);
      const group = new THREE.Group();
      group.position.set(pos.x, pos.y, pos.z);
      group.userData = { type: 'settlement', data: s, mapCoords: s.coords, era: s.era || 'Era II' };

      const tower = new THREE.Mesh(towerGeo, bronzeMat);
      tower.position.y = 0.9;
      tower.castShadow = true;
      group.add(tower);

      const spire = new THREE.Mesh(spireGeo, bronzeMat);
      spire.castShadow = true;
      group.add(spire);

      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.y = 2.15;
      group.add(beacon);

      const ringGeo = new THREE.RingGeometry(0.5, 0.75, 16);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xe9c46a, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 0.05;
      group.add(ring);

      const labelSprite = this.createTextSprite(s.name, '#fff3b0');
      labelSprite.position.set(0, 3.2, 0);
      labelSprite.scale.set(4.5, 1.8, 1);
      group.add(labelSprite);

      this.groups.settlements.add(group);
      this.interactiveObjects.push(group);
    });
  }

  /**
   * 2. ROTAS COMERCIAIS (Arcos Parabólicos 3D com Caravanas)
   */
  buildRoutes() {
    this.clearGroup(this.groups.routes);
    this.routeCaravans = [];
    const routes = this.worldData.layers.routes || [];

    routes.forEach(rt => {
      if (!rt.points || rt.points.length < 2) return;
      const pts3D = [];

      for (let i = 0; i < rt.points.length; i++) {
        const p = rt.points[i];
        const wPt = this.mapToWorldCoords(p[0], p[1]);
        const archElev = Math.sin((i / (rt.points.length - 1)) * Math.PI) * (rt.type === 'sea' ? 1.5 : 2.2);
        wPt.y += (rt.type === 'sea' ? 0.25 : 0.45) + archElev;
        pts3D.push(wPt);
      }

      const curve = new THREE.CatmullRomCurve3D(pts3D);
      const tubeGeo = new THREE.TubeGeometry(curve, 48, rt.type === 'sea' ? 0.14 : 0.18, 6, false);
      const isSea = rt.type === 'sea';

      const tubeMat = new THREE.MeshStandardMaterial({
        color: isSea ? 0x38bdf8 : 0xf97316,
        emissive: isSea ? 0x0284c7 : 0xc2410c,
        emissiveIntensity: 0.65,
        roughness: 0.3,
        metalness: 0.8
      });

      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      tube.userData = { type: 'route', data: rt, era: rt.era || 'Era II' };
      this.groups.routes.add(tube);
      this.interactiveObjects.push(tube);

      const caravanGeo = new THREE.SphereGeometry(0.32, 8, 8);
      const caravanMat = new THREE.MeshBasicMaterial({ color: isSea ? 0xfef08a : 0xffedd5 });
      const caravan = new THREE.Mesh(caravanGeo, caravanMat);
      this.groups.routes.add(caravan);

      this.routeCaravans.push({
        mesh: caravan,
        curve: curve,
        speed: 0.06 + Math.random() * 0.05,
        progress: Math.random()
      });
    });
  }

  /**
   * 3. HIDROGRAFIA (Rios Fluidos no Relevo 3D)
   */
  buildHydrography() {
    this.clearGroup(this.groups.hydrography);
    const rivers = this.worldData.layers.hydrography || [];

    rivers.forEach(r => {
      if (!r.points || r.points.length < 2) return;
      const pts3D = r.points.map(pt => {
        const w = this.mapToWorldCoords(pt[0], pt[1]);
        w.y += 0.16; // offset perfeito anti Z-fighting
        return w;
      });

      const curve = new THREE.CatmullRomCurve3D(pts3D);
      const isHigh = r.flow === 'high';
      const tubeGeo = new THREE.TubeGeometry(curve, 32, isHigh ? 0.22 : 0.15, 6, false);
      const riverMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.75,
        roughness: 0.1,
        metalness: 0.6
      });

      const riverMesh = new THREE.Mesh(tubeGeo, riverMat);
      riverMesh.userData = { type: 'hydrography', data: r };
      this.groups.hydrography.add(riverMesh);
      this.interactiveObjects.push(riverMesh);
    });
  }

  /**
   * 4. RECURSOS ESTRATÉGICOS (Totens e Ícones 3D Ancorados no Terreno)
   */
  buildResources() {
    this.clearGroup(this.groups.resources);
    const resources = this.worldData.layers.resources || [];

    resources.forEach(res => {
      const pos = this.mapToWorldCoords(res.coords[0], res.coords[1]);
      const group = new THREE.Group();
      group.position.set(pos.x, pos.y + 0.15, pos.z);
      group.userData = { type: 'resource', data: res, mapCoords: res.coords };

      const type = (res.type || '').toLowerCase();
      let iconMesh;

      if (type.includes('min') || type.includes('ouro') || type.includes('ferro') || type.includes('metal')) {
        // Cristal de minério multifacetado dourado/cobre
        const geo = new THREE.OctahedronGeometry(0.65, 0);
        const mat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.6, metalness: 0.9, roughness: 0.2 });
        iconMesh = new THREE.Mesh(geo, mat);
        iconMesh.position.y = 0.8;
      } else if (type.includes('port') || type.includes('mar') || type.includes('pesc')) {
        // Farol/Âncora costeira com beacon azul-ciano
        const geo = new THREE.CylinderGeometry(0.18, 0.35, 1.2, 8);
        const mat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.8, roughness: 0.3 });
        iconMesh = new THREE.Mesh(geo, mat);
        iconMesh.position.y = 0.6;
      } else if (type.includes('mad') || type.includes('florest') || type.includes('madeira')) {
        // Bosque/Árvore de cedro 3D
        const geo = new THREE.ConeGeometry(0.55, 1.4, 6);
        const mat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.8 });
        iconMesh = new THREE.Mesh(geo, mat);
        iconMesh.position.y = 0.7;
      } else {
        // Gemas / Obelisco de obsidiana púrpura
        const geo = new THREE.ConeGeometry(0.45, 1.2, 4);
        const mat = new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0x7e22ce, emissiveIntensity: 0.5, metalness: 0.5 });
        iconMesh = new THREE.Mesh(geo, mat);
        iconMesh.position.y = 0.6;
      }

      group.add(iconMesh);

      // Rótulo discreto
      const sprite = this.createTextSprite(res.name, '#86efac');
      sprite.position.set(0, 1.8, 0);
      sprite.scale.set(3.2, 1.2, 1);
      group.add(sprite);

      this.groups.resources.add(group);
      this.interactiveObjects.push(group);
    });
  }

  /**
   * 5. OROGRAFIA (Selos e Cristas de Montanhas)
   */
  buildOrography() {
    this.clearGroup(this.groups.orography);
    const chains = this.worldData.layers.orography || [];

    chains.forEach(m => {
      if (!m.points || m.points.length === 0) return;
      const mid = m.points[Math.floor(m.points.length / 2)];
      const pos = this.mapToWorldCoords(mid[0], mid[1]);

      const group = new THREE.Group();
      group.position.set(pos.x, pos.y + 1.2, pos.z);
      group.userData = { type: 'orography', data: m };

      // Selo de cume em bronze
      const crestGeo = new THREE.ConeGeometry(0.8, 1.6, 3);
      const crestMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.3 });
      const crest = new THREE.Mesh(crestGeo, crestMat);
      crest.rotation.y = Math.PI / 4;
      group.add(crest);

      const label = this.createTextSprite(`⛰️ ${m.name} (${m.elevation}m)`, '#fde68a');
      label.position.set(0, 2.0, 0);
      label.scale.set(5.5, 1.6, 1);
      group.add(label);

      this.groups.orography.add(group);
      this.interactiveObjects.push(group);
    });
  }

  /**
   * 6. REINOS E TERRITÓRIOS (Estandartes e Centros de Poder)
   */
  buildKingdoms() {
    this.clearGroup(this.groups.kingdoms);
    const kingdoms = this.worldData.layers.kingdoms || [];

    kingdoms.forEach(k => {
      const center = k.center || [500, 350];
      const pos = this.mapToWorldCoords(center[0], center[1]);

      const group = new THREE.Group();
      group.position.set(pos.x, pos.y + 0.2, pos.z);
      group.userData = { type: 'kingdom', data: k, era: k.era || 'Era II' };

      // Estandarte Real 3D
      const poleGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.8, 8);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, metalness: 0.8 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 1.9;
      group.add(pole);

      const flagGeo = new THREE.BoxGeometry(1.6, 0.9, 0.08);
      const flagMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(k.color || '#d62828'), roughness: 0.4 });
      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(0.8, 3.2, 0);
      group.add(flag);

      const label = this.createTextSprite(`👑 ${k.name}`, '#fecdd3');
      label.position.set(0, 4.4, 0);
      label.scale.set(5.0, 1.6, 1);
      group.add(label);

      this.groups.kingdoms.add(group);
      this.interactiveObjects.push(group);
    });
  }

  /**
   * 7. CIVILIZAÇÕES (Monólitos e Berços Antigos)
   */
  buildCivilizations() {
    this.clearGroup(this.groups.civilizations);
    const civs = this.worldData.layers.civilizations || [];

    civs.forEach(c => {
      const center = c.center || [500, 350];
      const pos = this.mapToWorldCoords(center[0], center[1]);

      const group = new THREE.Group();
      group.position.set(pos.x, pos.y + 0.1, pos.z);
      group.userData = { type: 'civilization', data: c, era: c.era || 'Era I' };

      // Pilar clássico antigo com capitel
      const colGeo = new THREE.CylinderGeometry(0.4, 0.5, 2.6, 8);
      const colMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6, metalness: 0.2 });
      const col = new THREE.Mesh(colGeo, colMat);
      col.position.y = 1.3;
      group.add(col);

      const capGeo = new THREE.BoxGeometry(1.2, 0.35, 1.2);
      const cap = new THREE.Mesh(capGeo, colMat);
      cap.position.y = 2.6;
      group.add(cap);

      const label = this.createTextSprite(`🏛️ ${c.name}`, '#cbd5e1');
      label.position.set(0, 3.6, 0);
      label.scale.set(5.4, 1.6, 1);
      group.add(label);

      this.groups.civilizations.add(group);
      this.interactiveObjects.push(group);
    });
  }

  /**
   * 8. CULTURAS (Totens Étnicos)
   */
  buildCultures() {
    this.clearGroup(this.groups.cultures);
    const cultures = this.worldData.layers.cultures || [];

    cultures.forEach(cult => {
      const center = cult.center || [500, 350];
      const pos = this.mapToWorldCoords(center[0], center[1]);

      const group = new THREE.Group();
      group.position.set(pos.x, pos.y + 0.1, pos.z);
      group.userData = { type: 'culture', data: cult };

      const totemGeo = new THREE.DodecahedronGeometry(0.7, 0);
      const totemMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.7, roughness: 0.3 });
      const totem = new THREE.Mesh(totemGeo, totemMat);
      totem.position.y = 1.0;
      group.add(totem);

      const label = this.createTextSprite(`🎭 ${cult.name}`, '#bae6fd');
      label.position.set(0, 2.3, 0);
      label.scale.set(4.8, 1.5, 1);
      group.add(label);

      this.groups.cultures.add(group);
      this.interactiveObjects.push(group);
    });
  }

  /**
   * 9. CLIMAS (Zonas Bioclimáticas Köppen)
   */
  buildClimates() {
    this.clearGroup(this.groups.climates);
    const climates = this.worldData.layers.climates || [];

    climates.forEach(clim => {
      const center = clim.center || [500, 350];
      const pos = this.mapToWorldCoords(center[0], center[1]);

      const group = new THREE.Group();
      group.position.set(pos.x, pos.y + 0.15, pos.z);
      group.userData = { type: 'climate', data: clim };

      const discGeo = new THREE.CylinderGeometry(1.8, 1.8, 0.1, 16);
      const discMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(clim.color || '#f4a261'),
        transparent: true,
        opacity: 0.45
      });
      const disc = new THREE.Mesh(discGeo, discMat);
      group.add(disc);

      const label = this.createTextSprite(`🌤️ ${clim.koppen} (${clim.name})`, '#fed7aa');
      label.position.set(0, 1.8, 0);
      label.scale.set(4.5, 1.4, 1);
      group.add(label);

      this.groups.climates.add(group);
      this.interactiveObjects.push(group);
    });
  }

  /**
   * 10. OCEAN LANDMASK (Contornos de Costas e Mares Internos)
   */
  buildOceanLandmask() {
    this.clearGroup(this.groups.ocean_landmask);
    const masks = this.worldData.layers.ocean_landmask || [];

    masks.forEach(geo => {
      if (!geo.polygon || geo.polygon.length < 3) return;
      if (geo.type === 'inland_sea') {
        const pts3D = geo.polygon.map(pt => {
          const w = this.mapToWorldCoords(pt[0], pt[1]);
          w.y = 0.12;
          return w;
        });
        const shape = new THREE.Shape();
        pts3D.forEach((p, idx) => {
          if (idx === 0) shape.moveTo(p.x, -p.z);
          else shape.lineTo(p.x, -p.z);
        });
        shape.closePath();

        const sGeo = new THREE.ShapeGeometry(shape);
        sGeo.rotateX(-Math.PI / 2);
        const sMat = new THREE.MeshStandardMaterial({
          color: 0x0284c7,
          transparent: true,
          opacity: 0.35,
          roughness: 0.1,
          metalness: 0.8
        });
        const mesh = new THREE.Mesh(sGeo, sMat);
        mesh.userData = { type: 'ocean_landmask', data: geo };
        this.groups.ocean_landmask.add(mesh);
        this.interactiveObjects.push(mesh);
      }
    });
  }

  /**
   * 11. MACROLÍNGUAS (Medalhões Flutuantes A a M)
   */
  buildMacrolanguages() {
    this.clearGroup(this.groups.macrolanguages);
    const langs = this.worldData.layers.macrolanguages || [];
    const sealGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.3, 24);
    sealGeo.rotateX(Math.PI / 2);

    langs.forEach(lang => {
      lang.centers.forEach(c => {
        const pt = this.mapToWorldCoords(c[0], c[1]);
        const group = new THREE.Group();
        group.position.set(pt.x, Math.max(pt.y + 3.8, 4.5), pt.z);
        group.userData = { type: 'macrolanguage', data: lang, basePosY: group.position.y };

        const sealMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(lang.color),
          metalness: 0.75,
          roughness: 0.28,
          transparent: true,
          opacity: 0.88
        });

        const seal = new THREE.Mesh(sealGeo, sealMat);
        group.add(seal);

        const rimGeo = new THREE.TorusGeometry(1.65, 0.12, 12, 32);
        const rimMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.2 });
        const rim = new THREE.Mesh(rimGeo, rimMat);
        group.add(rim);

        const label = this.createTextSprite(lang.code, '#0f172a', true);
        label.scale.set(2.4, 2.4, 1);
        label.position.z = 0.22;
        group.add(label);

        this.groups.macrolanguages.add(group);
        this.interactiveObjects.push(group);
      });
    });
  }

  /**
   * 12. BIOMAS (Enclaves Florestais Elevados no Relevo)
   */
  buildBiomeEnclaves() {
    this.clearGroup(this.groups.biomes);
    const biomes = this.worldData.layers.biomes || [];

    biomes.forEach(b => {
      if (!b.polygon || b.polygon.length < 3) return;
      const pts3D = b.polygon.map(p => this.mapToWorldCoords(p[0], p[1]));
      const shape = new THREE.Shape();
      pts3D.forEach((p, i) => {
        if (i === 0) shape.moveTo(p.x, -p.z);
        else shape.lineTo(p.x, -p.z);
      });
      shape.closePath();

      const geom = new THREE.ShapeGeometry(shape);
      geom.rotateX(-Math.PI / 2);

      // Ajusta cada vértice da geometria para a elevação real daquele ponto no terreno + 0.15
      const pos = geom.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vz = pos.getZ(i);
        const elev = this.getTerrainHeightAt(vx, vz);
        pos.setY(i, elev + 0.18);
      }
      geom.computeVertexNormals();

      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(b.color || '#2d6a4f'),
        transparent: true,
        opacity: 0.42,
        roughness: 0.8,
        metalness: 0.05,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.userData = { type: 'biome', data: b };
      this.groups.biomes.add(mesh);
      this.interactiveObjects.push(mesh);
    });
  }

  buildDecorations() {
    const compassGroup = new THREE.Group();
    compassGroup.position.set(-42, 0.6, -28);

    const ringGeo = new THREE.RingGeometry(3.5, 3.8, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, metalness: 0.85, roughness: 0.3 });
    const ring = new THREE.Mesh(ringGeo, goldMat);
    compassGroup.add(ring);

    const needleGeo = new THREE.ConeGeometry(0.7, 3.8, 4);
    needleGeo.rotateX(-Math.PI / 2);
    const needleMat = new THREE.MeshStandardMaterial({ color: 0xe63946, metalness: 0.8, roughness: 0.2 });
    const needle = new THREE.Mesh(needleGeo, needleMat);
    needle.position.z = -1.9;
    compassGroup.add(needle);

    const needleSouthGeo = new THREE.ConeGeometry(0.7, 3.8, 4);
    needleSouthGeo.rotateX(Math.PI / 2);
    const needleSouthMat = new THREE.MeshStandardMaterial({ color: 0x457b9d, metalness: 0.8, roughness: 0.2 });
    const needleSouth = new THREE.Mesh(needleSouthGeo, needleSouthMat);
    needleSouth.position.z = 1.9;
    compassGroup.add(needleSouth);

    this.groups.terrain.add(compassGroup);
  }

  createTextSprite(text, color = '#ffffff', isBold = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.font = `${isBold ? 'bold ' : ''}34px 'Segoe UI', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillText(text, 192 + 2, 64 + 2);

    ctx.fillStyle = color;
    ctx.fillText(text, 192, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
    return new THREE.Sprite(spriteMat);
  }

  clearGroup(group) {
    while (group.children.length > 0) {
      const obj = group.children[0];
      if (obj.geometry) obj.geometry.dispose();
      group.remove(obj);
    }
  }

  /**
   * Ativa / Desativa qualquer uma das 12 camadas na cena 3D
   */
  toggleLayer(layerKey, isActive) {
    if (this.groups[layerKey]) {
      this.groups[layerKey].visible = isActive;
    }
  }

  /**
   * Filtragem de Linha do Tempo (4 Eras Históricas)
   */
  setEra(eraNumber) {
    this.currentEra = eraNumber;
    this.applyEraFiltering();
  }

  applyEraFiltering() {
    if (!this.currentEra) {
      // Todas as Eras ativas
      Object.values(this.groups).forEach(g => {
        g.children.forEach(c => {
          c.visible = true;
          if (c.material) c.material.opacity = c.userData.originalOpacity || c.material.opacity || 1;
        });
      });
      return;
    }

    const eraMap = { 1: 'Era I', 2: 'Era II', 3: 'Era III', 4: 'Era IV' };
    const currentEraNum = parseInt(this.currentEra, 10);

    const checkEraObj = (obj) => {
      const eraStr = obj.userData?.era || obj.userData?.data?.era || 'Era II';
      let objEraNum = 2;
      if (eraStr.includes('I') && !eraStr.includes('II') && !eraStr.includes('IV')) objEraNum = 1;
      else if (eraStr.includes('II') && !eraStr.includes('III')) objEraNum = 2;
      else if (eraStr.includes('III')) objEraNum = 3;
      else if (eraStr.includes('IV')) objEraNum = 4;

      if (objEraNum > currentEraNum) {
        // Feição do futuro daquela era: oculta
        obj.visible = false;
      } else if (objEraNum < currentEraNum) {
        // Feição do passado: permanece como sítio histórico/ruína
        obj.visible = true;
      } else {
        // Feição do apogeu daquela era: plenamente visível e protagonista
        obj.visible = true;
      }
    };

    ['settlements', 'routes', 'kingdoms', 'civilizations'].forEach(grpKey => {
      this.groups[grpKey]?.children.forEach(checkEraObj);
    });
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });

    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      this.mouseDownPos.set(e.clientX, e.clientY);
    });

    // Hover e Raycasting
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.interactiveObjects, true);

      if (intersects.length > 0) {
        let top = intersects[0].object;
        while (top.parent && top.parent !== this.scene && !top.userData.type) {
          top = top.parent;
        }
        if (top.userData.type) {
          canvas.style.cursor = 'pointer';
          this.hoveredObject = top;
          return;
        }
      }
      canvas.style.cursor = 'default';
      this.hoveredObject = null;
    });

    // Clique para inspecionar ou criar feição sem alert/prompt
    canvas.addEventListener('click', (e) => {
      const dist = Math.hypot(e.clientX - this.mouseDownPos.x, e.clientY - this.mouseDownPos.y);
      if (dist > 5) return; // foi um arrasto de câmera, não clique!

      // Shift + Clique: abre o editor customizável com coordenadas pré-preenchidas!
      if (e.shiftKey) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const hits = this.raycaster.intersectObject(this.terrainMesh);
        if (hits.length > 0) {
          const pt3D = hits[0].point;
          const mapCoords = this.worldToMapCoords(pt3D.x, pt3D.z);
          if (window.openFeatureEditor) {
            window.openFeatureEditor({ coords: mapCoords, elevation: pt3D.y });
          }
        }
        return;
      }

      // Clique normal em objeto interativo: abre inspetor de lore
      if (this.hoveredObject && this.hoveredObject.userData && this.hoveredObject.userData.type) {
        const u = this.hoveredObject.userData;
        if (window.inspectAnyFeature) {
          window.inspectAnyFeature(u.type, u.data);
        }
      }
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    if (this.controls) this.controls.update();

    // Flutuação suave dos medalhões macrolinguísticos
    this.groups.macrolanguages.children.forEach((seal, idx) => {
      if (seal.userData.basePosY !== undefined) {
        seal.position.y = seal.userData.basePosY + Math.sin(time * 2.2 + idx * 0.8) * 0.35;
        seal.rotation.z = Math.sin(time * 0.8 + idx) * 0.04;
      }
    });

    // Tráfego contínuo das rotas comerciais (caravanas e naus)
    this.routeCaravans.forEach(item => {
      item.progress += delta * item.speed;
      if (item.progress > 1) item.progress = 0;
      const pt = item.curve.getPointAt(item.progress);
      item.mesh.position.copy(pt);
    });

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

window.Mapex3DEngine = Mapex3DEngine;
