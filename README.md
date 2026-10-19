# 🗺️ Mapex 2.5D — Worldbuilder Studio & GIS

Framework cartográfico interativo em **Vetor Puro & Canvas 2.5D (Dark GIS)** para criação de mundos, design geográfico e exploração de lore histórico com inteligência artificial.

---

## 🚀 Como Inicializar

Basta dar **duplo clique** no arquivo `Abrir_Mapex.bat`.
- Se o Node.js estiver instalado, ele inicia o servidor local e abre o navegador automaticamente em `http://localhost:3000`.
- Se estiver offline ou sem Node.js, ele abre diretamente o `index.html` via `file:///` com suporte standalone completo via LocalStorage!

---

## ✨ Principais Funcionalidades

- **Dashboard / Página Inicial:**
  - **Oceano Vazio:** Crie um mundo do zero absoluto, pintando costas, continentes e ilhas.
  - **Arquipélago Procedural:** Gera dezenas de ilhas, portos e canais navegáveis.
  - **Continente Central Procedural:** Gera uma grande massa de terra com cordilheiras, bacias hidrográficas e reinos.
  - **Kosmos Canônico:** Carrega o mundo histórico oficial baseado nas cartas manuscritas 107937, 107938 e 107944.
  - **Importar / Exportar JSON:** Salve e compartilhe arquivos `.json` de mapas completos.
  - **Catálogo de Mapas Salvos:** Lista e gerencia múltiplos mundos diretamente no navegador.

- **Interface 100% Full-Screen & Gavetas Retráteis:**
  - O mapa ocupa toda a tela (`100vw`, `100vh`) sem colunas fixas atrapalhando a visualização.
  - **Gaveta Esquerda (`🗺️ Camadas & Câmera`):** Alternância das 12 camadas GIS, temas cartográficos (Dark GIS, Pergaminho, Vetorial) e controles de Câmera 2.5D (Tilt, Rotação, Zoom).
  - **Gaveta Direita (`📜 Inspetor & Lore`):** 3 abas essenciais — Inspetor de atributos e crônicas, Editor completo de feições com gerador de nomes, e Simulador das 4 Eras Históricas.

- **Barra de Ferramentas de Criação (Studio Toolbar):**
  - `🖐️ Navegar`: Seleção de feições, pan de câmera com arrasto e zoom com scroll.
  - `🏝️ Terra`: Pincel livre de massas continentais e canais marítimos.
  - `⛰️ Relevo 2.5D`: Pincel de colinas e relevos com sombreamento solar isométrico.
  - `🏔️ Cristas`: Traçado de cordilheiras orográficas por nós.
  - `🌊 Rios`: Traçado de cursos d'água com gradiente de fluxo.
  - `🌲 Biomas`: Pincel de florestas, desertos, pântanos, tundras e savanas.
  - `🏰 Cidades`: Carimbador de assentamentos com nomes procedurais gerados pelo banco fonético A a M.
  - `👑 Reinos`: Proclamação de soberanias e esferas territoriais.
  - `💎 Recursos`: Posicionamento de minas de ouro/prata, portos e forjas.
  - `🛤️ Rotas`: Traçado de rotas comerciais terrestres e marítimas.
  - `🧹 Borracha`: Clique em qualquer feição para apagá-la instantaneamente.

---

## 🛠️ Validação de Integridade

Para validar a integridade estrutural e espacial das 12 camadas, execute:
```bash
node src/services/validate_layers.js
```
