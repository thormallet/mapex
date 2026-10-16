---
name: skill-route-pathfinder
description: Calcula rotas comerciais terrestres e marítimas realistas (A* ponderado por topografia, rios e ventos).
---
# Pesos de Custo de Movimento (Cost Surface)
- Oceano aberto / Costeiro (`ocean_landmask`): custo `0.4` (muito rápido entre `G` e `K`, ou entre os dois blocos da família `A`).
- Rio navegável (`hydrography`): custo `0.5` a favor da corrente, `0.9` contra a corrente.
- Planície / Estepe (`biomes`): custo `1.0`.
- Bacia Florestal Fechada (`E` e `E/L`): custo `2.8` (exige trilhas específicas).
- Cordilheira (`orography`): custo `6.5` (intransponível exceto nos Passos de Montanha mapeados).
