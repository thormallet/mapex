---
name: skill-raster-to-vector
description: Extrai polígonos GeoJSON, linhas de rios e cristas de montanhas a partir das imagens base 107937.jpg, 107938.jpg e 107944.jpg usando a visão do Gemini 3.8 Flash.
---
# Procedimento de Extração Multimodal
1. Carregue a imagem de referência em coordenadas normalizadas `[0.0 - 1000.0, 0.0 - 700.0]`.
2. Para `107944_landmask.jpg`, extraia o contorno fechado das massas continentais e ilhas por limiarização de luminância (traço preto sobre fundo branco).
3. Para `107937_geography.jpg`, separe:
   - Traços azuis -> `hydrography` (LineStrings orientadas da montanha para o mar).
   - Picos em '^' -> `orography` (LineStrings de crista com atributo `elevation_m` entre 1800 e 5200).
   - Contornos festonados fechados -> `biomes` (Polígonos tipo `dense_canopy_basin`).
4. Salve o resultado validado em `src/data/world_layers.json`.
