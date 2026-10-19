---
name: skill-cartographic-validator
description: Valida rapidamente world_layers.json contra o schema, verifica IDs duplicados, limites do canvas (1000x700) e impede cidades ou recursos em zonas oceânicas.
---
# Skill: Cartographic Validator (`skill-cartographic-validator`)

Use esta skill sempre após qualquer edição em `src/data/world_layers.json` ou `src/engine/` para garantir que o mapa 3D/2.5D não quebre.

## Checklist de Validação Rápida
1. **Integridade JSON e Schema**:
   - Verifique se `src/data/world_layers.json` é um JSON estritamente válido e contém `metadata` e `layers`.
2. **Unicidade de IDs**:
   - Nenhum objeto dentro de `layers` pode ter `id` vazio ou duplicado.
3. **Limites Espaciais (`1000 x 700`)**:
   - Todas as coordenadas `[x, y]` em `coords`, `center`, `centers`, `points` e `polygon` devem estar estritamente entre `0 <= x <= 1000` e `0 <= y <= 700`.
4. **Prevenção de Assentamentos no Oceano**:
   - Verifique com `skill-spatial-calibrator` se nenhum assentamento terrestre caiu nas zonas de mar aberto (ex: Golfo Interno `[320..410, 420..490]`, Estreito Oriental `[790..830, 340..420]` ou Oceano Austral `y > 665`).

## Comando Automático de Auditoria
Execute no terminal para validar instantaneamente:
```powershell
node src/services/validate_layers.js
```
