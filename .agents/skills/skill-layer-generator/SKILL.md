---
name: skill-layer-generator
description: Gera ou expande proceduralmente qualquer uma das 12 camadas do Mapex usando Gemini 3.8 Flash Structured Outputs.
---
# Como Gerar Camadas com Coerência
Quando acionada para criar elementos em uma camada:
1. Leia as camadas de base (`orography`, `hydrography`, `macrolanguages`) em `src/data/world_layers.json`.
2. Aplique a matriz de dependência:
   - `climates` depende de: latitude + `orography` + correntes marítimas.
   - `biomes` depende de: `climates` + `hydrography` + bacias fechadas do Mapa 1.
   - `cultures` depende de: `macrolanguages` + `biomes`.
   - `kingdoms` e `settlements` dependem de: `cultures` + bacias fluviais de `hydrography` + recursos de `resources`.
3. Produza exclusivamente JSON aderente ao `src/schemas/layer_schema.json`.
