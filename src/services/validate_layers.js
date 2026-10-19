const fs = require('fs');
const path = require('path');

const layersPath = path.join(__dirname, '..', 'data', 'world_layers.json');
const schemaPath = path.join(__dirname, '..', 'schemas', 'layer_schema.json');

function validate() {
  const errors = [];
  const warnings = [];

  if (!fs.existsSync(layersPath)) {
    console.error('❌ ERRO: src/data/world_layers.json não encontrado.');
    process.exit(1);
  }

  let data, schema;
  try {
    data = JSON.parse(fs.readFileSync(layersPath, 'utf8'));
  } catch (e) {
    console.error('❌ ERRO DE SINTAXE JSON em world_layers.json:', e.message);
    process.exit(1);
  }

  try {
    schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  } catch (e) {
    console.error('❌ ERRO DE SINTAXE JSON em layer_schema.json:', e.message);
    process.exit(1);
  }

  if (!data.metadata || !data.layers) {
    errors.push('Estrutura raiz inválida: "metadata" e "layers" são obrigatórios.');
  }

  const maxW = (data.metadata && data.metadata.canvasWidth) || 1000;
  const maxH = (data.metadata && data.metadata.canvasHeight) || 700;
  const seenIds = new Set();
  let totalFeatures = 0;

  function checkPoint(pt, ctx) {
    if (!Array.isArray(pt) || pt.length < 2 || typeof pt[0] !== 'number' || typeof pt[1] !== 'number') {
      errors.push(`${ctx}: Coordenada inválida ${JSON.stringify(pt)}`);
      return;
    }
    const [x, y] = pt;
    if (x < 0 || x > maxW || y < 0 || y > maxH) {
      errors.push(`${ctx}: Coordenada [${x}, ${y}] fora dos limites do canvas (0..${maxW}, 0..${maxH}).`);
    }
  }

  if (data.layers && typeof data.layers === 'object') {
    for (const [layerName, items] of Object.entries(data.layers)) {
      if (!Array.isArray(items)) {
        errors.push(`Camada "${layerName}" deve ser um array.`);
        continue;
      }
      for (const item of items) {
        totalFeatures++;
        const ctx = `[${layerName}] ${item.id || item.name || 'sem-id'}`;
        if (!item.id) {
          errors.push(`${ctx}: Feature sem campo "id".`);
        } else if (seenIds.has(item.id)) {
          errors.push(`${ctx}: ID duplicado "${item.id}".`);
        } else {
          seenIds.add(item.id);
        }

        if (item.coords) checkPoint(item.coords, ctx);
        if (item.center) checkPoint(item.center, ctx);
        if (Array.isArray(item.centers)) item.centers.forEach(p => checkPoint(p, ctx));
        if (Array.isArray(item.points)) item.points.forEach(p => checkPoint(p, ctx));
        if (Array.isArray(item.polygon)) item.polygon.forEach(p => checkPoint(p, ctx));

        // Checagem rápida de zonas de mar aberto para assentamentos
        if (layerName === 'settlements' && Array.isArray(item.coords)) {
          const [x, y] = item.coords;
          const inGolfoK = x > 325 && x < 385 && y > 430 && y < 490;
          const inOceanoOeste = x < 75;
          const inOceanoSul = y > 670;
          if (inGolfoK || inOceanoOeste || inOceanoSul) {
            warnings.push(`${ctx}: Coordenada [${x}, ${y}] parece cair em zona marítima aberta. Verifique com skill-spatial-calibrator.`);
          }
        }
      }
    }
  }

  if (warnings.length > 0) {
    console.warn('⚠️ AVISOS ESPACIAIS:');
    warnings.forEach(w => console.warn('  -', w));
  }

  if (errors.length > 0) {
    console.error('❌ FALHA NA AUDITORIA CARTOGRÁFICA:');
    errors.forEach(err => console.error('  -', err));
    process.exit(1);
  }

  console.log(`✅ AUDITORIA MAPEX OK: ${Object.keys(data.layers).length} camadas e ${totalFeatures} feições validadas sem erros (Escala ${maxW}x${maxH}).`);
}

validate();
