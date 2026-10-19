---
name: skill-spatial-calibrator
description: Gabarito de calibração espacial e costeira (1000x700) para alinhar polígonos, rios, montanhas e cidades exatamente sobre as cartas manuscritas 107944, 107937 e 107938.
---
# Skill: Spatial & Coastal Calibrator (`skill-spatial-calibrator`)

Consulte este gabarito antes de criar ou mover qualquer coordenada `[X, Y]` em `src/data/world_layers.json` (Escala do Canvas: `1000 x 700`, onde `[0,0]` é o canto superior esquerdo e `[1000,700]` é o canto inferior direito).

---

## 1. Zonas de Terra Firme por Região Macrolinguística (`107938.jpg` + `107944.jpg`)

| Código | Região Geográfica | Centro Principal `[X, Y]` | Caixa Segura em Terra Firme (`X_min..X_max`, `Y_min..Y_max`) |
| :--- | :--- | :--- | :--- |
| **A (Norte)** | Extremo Leste do Continente Principal | `[755, 235]` | `X: 720..870`, `Y: 160..365` |
| **A (Sul)** | Leste do Continente Sudeste | `[845, 485]` | `X: 790..910`, `Y: 425..580` |
| **B** | Ilha Isolada Austral (Sul de F) | `[715, 650]` | `X: 695..740`, `Y: 635..665` |
| **C** | Faixa Costeira Sul-Central (Sombra da Serra) | `[575, 360]` | `X: 485..650`, `Y: 350..415` |
| **D** | Costa Noroeste do Continente Sudeste | `[620, 465]` | `X: 520..680`, `Y: 430..520` |
| **E** | Grande Bacia Florestal Fechada Central | `[540, 290]` | `X: 505..605`, `Y: 195..355` |
| **F** | Vasta Planície/Vales do Continente Sudeste | `[665, 545]` | `X: 560..780`, `Y: 480..615` |
| **G** | Arquipélago Ocidental (Norte, Centro, Sul) | `[105, 225]`, `[160, 455]`, `[160, 625]` | Ilhas em `X: 85..195`, `Y: 180..270` / `410..500` / `590..650` |
| **H** | Noroeste Boreal e Península Ocidental | `[275, 200]` | `X: 215..350`, `Y: 145..265` |
| **I** | Arquipélago Ártico Setentrional | `[500, 90]` | Ilhas em `X: 440..570`, `Y: 65..110` |
| **J** | Planalto e Cordilheira Centro-Nordeste | `[625, 205]` | `X: 580..705`, `Y: 145..310` |
| **K** | Massa Hegemônica Sudoeste/Golfo Interno | `[415, 395]` | `X: 260..480`, `Y: 290..525` *(Evitar água do Golfo em `320..395, 420..485`)* |
| **L** | Mesopotâmia Centro-Norte (entre H, K e E) | `[435, 235]` | `X: 390..495`, `Y: 185..280` |
| **E/L** | Corredor Florestal Fechado Ocidental | `[395, 290]` | `X: 360..450`, `Y: 205..305` |
| **G/K** | Enclave Portuário na Grande Ilha Ocidental | `[195, 465]` | `X: 175..215`, `Y: 440..485` |
| **H/I, I/J, I/J/L** | Ilhas de Transição do Mar Boreal | `[405, 115]`, `[560, 115]`, `[485, 165]` | Ilhas pontuais entre `X: 390..580`, `Y: 105..175` |
| **M/E** | Ilha Austral de Substrato M/E | `[585, 625]` | `X: 560..615`, `Y: 605..645` |

---

## 2. Eixos Orográficos e Bacias Florestais (`107937.jpg`)
- **Grande Cordilheira Meridional (`mnt_sul_central`)**: De `[285, 545]` subindo a `[510, 410]` até `[845, 355]`.
- **Cadeia Boreal-Oriental (`mnt_norte_leste`)**: De `[675, 135]` descendo até `[715, 340]`.
- **Serra Ocidental (`mnt_noroeste`)**: De `[245, 275]` até `[405, 165]`.
- **Espinhaço do Continente Austral (`mnt_sudeste_dorsal`)**: De `[485, 575]` até `[810, 385]`.
- **As 4 Bacias Florestais Cercadas**:
  1. `bio_bacia_e`: Centro `[555, 285]`
  2. `bio_bacia_el`: Centro `[405, 260]`
  3. `bio_bacia_se_grande`: Centro `[795, 485]`
  4. `bio_bacia_se_peq`: Centro `[660, 515]`

## 3. Zonas Marítimas / Proibidas para Assentamentos Terrestres
- **Oceano Ocidental Aberto**: `X < 80` ou `X: 215..255, Y: 320..580`
- **Golfo Interno de K**: `X: 320..390, Y: 425..495`
- **Canal Intercontinental (entre Continente Norte e Continente Sudeste)**: Faixa marítima diagonal de `[450, 520]` passando por `[600, 415]` até `[830, 365]`.
- **Oceano Boreal**: `Y < 60`
- **Oceano Austral**: `Y > 668`
