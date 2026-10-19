# 🗺️ Mapex 3D & 2.5D — Worldbuilding GIS

Framework cartográfico interativo em **Three.js WebGL + 2.5D** para worldbuilding e exploração geográfica com inteligência artificial **Gemini 3.8 Flash**.

---

## 🚀 Acesso Rápido

- 🌐 **Versão Web (GitHub Pages):** [https://thormallet.github.io/mapex/](https://thormallet.github.io/mapex/)
- 💻 **Execução Local (Windows):** Basta dar duplo clique no arquivo `Abrir_Mapex.bat` ou executar:
  ```powershell
  python -m http.server 3000
  ```
  e acessar `http://localhost:3000`.

---

## ✨ Recursos

- **Preservação de Cartas Originais:** Renderiza diretamente os mapas manuscritos originais (`107937.jpg` Geografia, `107938.jpg` Macrolínguas e `107944.jpg` Costas limpas).
- **Relevo 3D Real (Elevação Orográfica):** As cordilheiras e serras se erguem no espaço tridimensional sobre a malha do terreno com controle de exagero vertical (0% a 300%).
- **Iluminação Solar Dinâmica:** Sol direcional ajustável que projeta sombras físicas nos vales (Alvorecer, Meio-Dia, Poente Dourado e Noite).
- **Assentamentos 3D:** Torres e obeliscos em relevo com faróis de luz emissiva e rótulos flutuantes.
- **Rotas Comerciais em Arco 3D:** Arcos parabólicos luminosos com caravanas e embarcações animadas em tempo real.
- **Selos Macrolinguísticos 3D:** Medalhões translúcidos com borda dourada que levitam suavemente sobre cada região linguística (A a M).
- **Inspetor Cartográfico:** Clique em qualquer objeto para visualizar detalhes culturais, topográficos e demográficos.
- **Criação Interativa:** `Shift + Clique` no mapa para fundar novos assentamentos na altitude exata do terreno.
- **Alternância de Modos:** Alterne a qualquer momento entre o **Modo 3D Real (Three.js)** e o **Modo 2.5D Clássico (CSS)**.

---

## 🤖 Agentes e Skills no Antigravity

### Agentes
- **`mapex-orchestrator` (Main Agent)**: Orquestrador e coordenador-geral das 12 camadas GIS e motores visuais.
- **`physical-cartographer`**: Geomorfologia, orografia, hidrologia, climas e biomas (`107937` e `107944`).
- **`anthro-linguist`**: Famílias macrolinguísticas (`A`–`M`), zonas híbridas, culturas e toponímia (`107938`).
- **`geopolitics-economist`**: Civilizações, reinos, assentamentos, recursos econômicos, rotas comerciais e história.
- **`webgl-25d-engineer`**: Motor 3D/2.5D Three.js, malhas de relevo, iluminação solar e shaders (`src/engine/`).
- **`cartographic-ui`**: Interface HTML/CSS, HUD cartográfico, Inspetor de Lore, filtros e linha do tempo (`index.html`).

### Skills
- `skill-spatial-calibrator`: Gabarito de calibração espacial e costeira (`1000x700`) sobre as 3 cartas manuscritas.
- `skill-historical-chronicler`: Simulador de Linha do Tempo (4 Eras) e gerador de Lore/Crônicas para o Inspetor.
- `skill-cartographic-validator`: Auditoria instantânea de JSON, schema e limites costeiros (`node src/services/validate_layers.js`).
- `skill-layer-generator`: Geração procedural estruturada das 12 camadas GIS.
- `skill-linguistic-evolver`: Evolução fonética e geração de topônimos consistentes.
- `skill-raster-to-vector`: Extração de polígonos e feições a partir das cartas base.
- `skill-route-pathfinder`: Cálculo de rotas terrestres e marítimas ponderadas por topografia.
