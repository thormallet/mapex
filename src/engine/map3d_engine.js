/**
 * MAPEX 3D Engine — Renderizador Tridimensional com Preservação Raster
 * Utiliza Three.js com elevação orográfica de terreno, iluminação solar dinâmica,
 * torres de assentamentos 3D, rotas comerciais em arco e selos linguísticos flutuantes.
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
    
    // Grupos de camadas 3D
    this.groups = {
      terrain: new THREE.Group(),
      settlements: new THREE.Group(),
      routes: new THREE.Group(),
      macrolanguages: new THREE.Group(),
      biomes: new THREE.Group(),
      orographyMarkers: new THREE.Group(),
      particles: new THREE.Group()
    };
    
    // Iluminação
    this.sunLight = null;
    this.ambientLight = null;
    this.sunAngle = 0.85; // radianos
    
    // Raycaster e interação
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
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

    // 8. Constrói os elementos 3D do mundo
    this.buildSettlements();
    this.buildRoutes();
    this.buildMacrolanguages();
    this.buildBiomeEnclaves();
    this.buildDecorations();

    // 9. Eventos de mouse e redimensionamento
    this.bindEvents();

    // 10. Loop de renderização
    this.animate();
  }

  setupLighting() {
    // Luz ambiente quente estilo pergaminho iluminado
    this.ambientLight = new THREE.AmbientLight(0xffecd1, 0.65);
    this.scene.add(this.ambientLight);

    // Sol de cartógrafo direcional (projeta sombras sobre as montanhas)
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

    // Luz de preenchimento azul-noite suave para profundidade nas sombras
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
    // value de 0 a 100
    this.sunAngle = (value / 100) * Math.PI * 2;
    this.updateSunPosition();
  }

  /**
   * Converte coordenadas 2D do mapa original [0..1000, 0..700]
   * em coordenadas 3D de mundo no Three.js [X, Z] e interpola a elevação Y.
   */
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

  /**
   * Cria mapa de elevação orográfica desenhando as cristas montanhosas
   * em um canvas offscreen e aplicando blur gaussiano.
   */
  generateOrographyHeightmap() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 358;
    const ctx = canvas.getContext('2d');

    // Fundo base (terra plana com elevação sutil)
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Desenha as cordilheiras do mapa 1 como linhas com gradiente e blur
    const orography = this.worldData.layers.orography || [];
    orography.forEach(m => {
      if (!m.points || m.points.length < 2) return;
      const intensity = Math.min(255, Math.round((m.elevation / 4600) * 230));
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

      // Passe de crista afiada no topo
      ctx.lineWidth = 4;
      ctx.shadowBlur = 4;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.restore();
    });

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  async buildTerrain() {
    const worldW = 100;
    const worldH = 70;
    const segX = 200;
    const segY = 140;

    this.terrainGeo = new THREE.PlaneGeometry(worldW, worldH, segX, segY);
    this.terrainGeo.rotateX(-Math.PI / 2); // plano horizontal X-Z

    // Lê os dados de elevação do heightmap gerado
    const heightData = this.generateOrographyHeightmap();
    const pos = this.terrainGeo.attributes.position;
    this.baseHeights = new Float32Array(pos.count);

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);

      // Mapeia para pixels do heightmap
      const u = (vx / worldW) + 0.5;
      const v = (vz / worldH) + 0.5;
      const px = Math.floor(Math.max(0, Math.min(1, u)) * (heightData.width - 1));
      const py = Math.floor(Math.max(0, Math.min(1, v)) * (heightData.height - 1));
      const pIdx = (py * heightData.width + px) * 4;

      const rawVal = heightData.data[pIdx] / 255.0; // 0..1
      const elevation = Math.pow(rawVal, 1.45) * 6.5; // relevo montanhoso
      this.baseHeights[i] = elevation;
      pos.setY(i, elevation * this.reliefExaggeration);
    }

    this.terrainGeo.computeVertexNormals();

    // Carrega a textura inicial da carta manuscrita
    const currentBaseMap = document.getElementById('baseMapSelect') ? document.getElementById('baseMapSelect').value : 'assets/base_maps/107937.jpg';
    this.activeTexture = await this.loadTextureAsync(currentBaseMap);
    this.activeTexture.anisotropy = 8;

    // Material com shaders de iluminação física e pergaminho
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

    // Mesa de carvalho/moldura cartográfica 3D em torno do mapa
    this.buildFramedBorder(worldW, worldH);

    // Lâmina d'água oceanica translúcida nas bordas
    this.buildOceanWater(worldW, worldH);
  }

  buildFramedBorder(worldW, worldH) {
    const borderThick = 2.5;
    const borderHeight = 2.0;
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1b130e,
      roughness: 0.5,
      metalness: 0.35
    });

    // Borda moldada decorativa
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

    // Atualiza a altura de todos os elementos 3D posicionados no relevo
    this.repositionElementsOnRelief();
  }

  repositionElementsOnRelief() {
    this.groups.settlements.children.forEach(obj => {
      if (obj.userData.mapCoords) {
        const pt = this.mapToWorldCoords(obj.userData.mapCoords[0], obj.userData.mapCoords[1]);
        obj.position.y = pt.y;
      }
    });
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
        // Fallback procedural em caso de falha de carregamento
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

  /**
   * Constrói obeliscos/torres 3D com luz emissiva para cidades
   */
  buildSettlements() {
    this.clearGroup(this.groups.settlements);
    const settlements = this.worldData.layers.settlements || [];

    const towerGeo = new THREE.CylinderGeometry(0.2, 0.45, 1.8, 6);
    const spireGeo = new THREE.ConeGeometry(0.25, 0.9, 6);
    spireGeo.translate(0, 1.35, 0);

    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0xd4a373,
      metalness: 0.85,
      roughness: 0.25
    });

    const beaconGeo = new THREE.SphereGeometry(0.26, 12, 12);
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0xffe066,
      emissive: 0xffaa00,
      emissiveIntensity: 0.9
    });

    settlements.forEach(s => {
      const pos = this.mapToWorldCoords(s.coords[0], s.coords[1]);
      const group = new THREE.Group();
      group.position.set(pos.x, pos.y, pos.z);
      group.userData = { type: 'settlement', data: s, mapCoords: s.coords };

      // Torre
      const tower = new THREE.Mesh(towerGeo, bronzeMat);
      tower.position.y = 0.9;
      tower.castShadow = true;
      group.add(tower);

      // Pináculo
      const spire = new THREE.Mesh(spireGeo, bronzeMat);
      spire.castShadow = true;
      group.add(spire);

      // Beacon luminoso flutuante no topo
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.y = 2.15;
      group.add(beacon);

      // Anel de ancoragem na base
      const ringGeo = new THREE.RingGeometry(0.5, 0.75, 16);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xe9c46a, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 0.05;
      group.add(ring);

      // Rótulo flutuante em 3D (Sprite)
      const labelSprite = this.createTextSprite(s.name, '#fff3b0');
      labelSprite.position.set(0, 3.2, 0);
      labelSprite.scale.set(4.5, 1.8, 1);
      group.add(labelSprite);

      this.groups.settlements.add(group);
      this.interactiveObjects.push(group);
    });
  }

  /**
   * Constrói rotas comerciais em arcos parabólicos 3D com partículas de tráfego
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
      tube.userData = { type: 'route', data: rt };
      this.groups.routes.add(tube);
      this.interactiveObjects.push(tube);

      // Ponto luminoso de caravana/embarcação que viaja pela rota
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
   * Constrói selos circulares flutuantes estilo medalhão para as famílias macrolinguísticas
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

        // Medalhão 3D
        const sealMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(lang.color),
          metalness: 0.75,
          roughness: 0.28,
          transparent: true,
          opacity: 0.88
        });

        const seal = new THREE.Mesh(sealGeo, sealMat);
        group.add(seal);

        // Borda dourada em relevo
        const rimGeo = new THREE.TorusGeometry(1.65, 0.12, 12, 32);
        const rimMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.2 });
        const rim = new THREE.Mesh(rimGeo, rimMat);
        group.add(rim);

        // Letra central em alta resolução
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
   * Enclaves ecológicos/florestais 3D (as 4 bacias densas de 107937)
   */
  buildBiomeEnclaves() {
    this.clearGroup(this.groups.biomes);
    const biomes = this.worldData.layers.biomes || [];

    biomes.forEach(b => {
      if (!b.polygon || b.polygon.length < 3) return;
      const pts = b.polygon.map(p => this.mapToWorldCoords(p[0], p[1]));
      const shape = new THREE.Shape();
      pts.forEach((p, i) => {
        if (i === 0) shape.moveTo(p.x, -p.z);
        else shape.lineTo(p.x, -p.z);
      });
      shape.closePath();

      const geom = new THREE.ShapeGeometry(shape);
      geom.rotateX(-Math.PI / 2);

      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(b.color),
        transparent: true,
        opacity: 0.38,
        roughness: 0.6,
        metalness: 0.1,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.y = 0.12;
      mesh.userData = { type: 'biome', data: b };
      this.groups.biomes.add(mesh);
      this.interactiveObjects.push(mesh);
    });
  }

  buildDecorations() {
    // Rosa dos ventos estilizada em bronze 3D no canto superior esquerdo
    const compassGroup = new THREE.Group();
    compassGroup.position.set(-42, 0.6, -28);

    const ringGeo = new THREE.RingGeometry(3.5, 3.8, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, metalness: 0.85, roughness: 0.3 });
    const ring = new THREE.Mesh(ringGeo, goldMat);
    compassGroup.add(ring);

    // Agulha do Norte
    const needleGeo = new THREE.ConeGeometry(0.7, 3.8, 4);
    needleGeo.rotateX(-Math.PI / 2);
    const needleMat = new THREE.MeshStandardMaterial({ color: 0xe63946, metalness: 0.8, roughness: 0.2 });
    const needle = new THREE.Mesh(needleGeo, needleMat);
    needle.position.z = -1.9;
    compassGroup.add(needle);

    // Agulha do Sul
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
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.font = `${isBold ? 'bold ' : ''}38px 'Segoe UI', serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Sombra para contraste sobre o relevo
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillText(text, 128 + 2, 64 + 2);

    ctx.fillStyle = color;
    ctx.fillText(text, 128, 64);

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

  bindEvents() {
    window.addEventListener('resize', () => {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });

    const canvas = this.renderer.domElement;

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

    // Clique para inspecionar
    canvas.addEventListener('click', (e) => {
      // Se estiver com Shift pressionado, cria assentamento
      if (e.shiftKey) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const hits = this.raycaster.intersectObject(this.terrainMesh);
        if (hits.length > 0) {
          const pt3D = hits[0].point;
          const mapCoords = this.worldToMapCoords(pt3D.x, pt3D.z);
          const name = prompt('Nome do novo assentamento 3D:', 'Nova Cidade');
          if (!name) return;

          this.worldData.layers.settlements.push({
            id: 'cit_' + Date.now(),
            name: name,
            type: 'city',
            lang: 'K',
            coords: mapCoords,
            pop: 32000
          });

          this.buildSettlements();
          if (window.buildLayerMenu) window.buildLayerMenu();
          inspectItem({
            title: `Nova Cidade Criada: ${name}`,
            details: `Coordenadas 3D no Terreno: [${mapCoords[0]}, ${mapCoords[1]}]\nElevação do Terreno: ${pt3D.y.toFixed(2)}m\nPopulação Estimada: 32.000 hab.`
          });
        }
        return;
      }

      if (this.hoveredObject && this.hoveredObject.userData) {
        const u = this.hoveredObject.userData;
        if (u.type === 'settlement') {
          inspectItem({
            title: `Assentamento 3D: ${u.data.name}`,
            details: `Tipo: ${u.data.type}\nLíngua Predominante: Família ${u.data.lang}\nPopulação Estimada: ${u.data.pop.toLocaleString('pt-BR')} hab.\nCoordenadas do Mapa: [${u.data.coords[0]}, ${u.data.coords[1]}]`
          });
        } else if (u.type === 'macrolanguage') {
          inspectItem({
            title: `Macrolíngua: Família ${u.data.code} — ${u.data.name}`,
            details: `Classificação: ${u.data.isHybrid ? 'Zona de Transição / Crioulização' : 'Tronco Macrolinguístico Primário'}\nFidelidade: Carta Manuscrita 107938.`
          });
        } else if (u.type === 'route') {
          inspectItem({
            title: `Rota Comercial: ${u.data.name}`,
            details: `Modalidade: ${u.data.type === 'sea' ? 'Navegação Marítima' : 'Caravana Terrestre'}\nPontos Mapeados: ${u.data.points.length} nós topográficos.`
          });
        } else if (u.type === 'biome') {
          inspectItem({
            title: `Bioma 3D: ${u.data.name}`,
            details: `Tipo: ${u.data.type}\nEnclave ecológico delimitado conforme o Mapa 1 (107937.jpg).`
          });
        }
      }
    });
  }

  toggleLayer(layerKey, isActive) {
    if (layerKey === 'settlements') this.groups.settlements.visible = isActive;
    else if (layerKey === 'routes') this.groups.routes.visible = isActive;
    else if (layerKey === 'macrolanguages') this.groups.macrolanguages.visible = isActive;
    else if (layerKey === 'biomes') this.groups.biomes.visible = isActive;
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // 1. Atualiza OrbitControls
    if (this.controls) this.controls.update();

    // 2. Animação de flutuação dos selos macrolinguísticos
    this.groups.macrolanguages.children.forEach((seal, idx) => {
      if (seal.userData.basePosY !== undefined) {
        seal.position.y = seal.userData.basePosY + Math.sin(time * 2.2 + idx * 0.8) * 0.35;
        seal.rotation.z = Math.sin(time * 0.8 + idx) * 0.04;
      }
    });

    // 3. Animação de tráfego de rotas (caravanas e navios)
    this.routeCaravans.forEach(item => {
      item.progress += delta * item.speed;
      if (item.progress > 1) item.progress = 0;
      const pt = item.curve.getPointAt(item.progress);
      item.mesh.position.copy(pt);
    });

    // 4. Renderiza cena
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

window.Mapex3DEngine = Mapex3DEngine;
