---
name: skill-historical-chronicler
description: Simula eras históricas, migrações das famílias A-M, evolução de fronteiras e gera crônicas/lore detalhado de cidades, reinos e rotas para o Inspetor Cartográfico.
---
# Skill: Historical Simulator & Lore Chronicler (`skill-historical-chronicler`)

Use esta skill para simular a evolução histórica do mundo (Linha do Tempo / Eras) e para enriquecer feições de `src/data/world_layers.json` com crônicas profundas exibidas no Inspetor Cartográfico.

---

## 1. Cronologia Oficial das 4 Grandes Eras do Kosmos (Mapex)
1. **Era I — Alvorecer das Claustras (Neolítico / Calcolítico)**:
   - Isolamento das populações proto-linguísticas nas 4 grandes bacias florestais (`E`, `E/L`, `F/A`) e refúgios insulares (`B`, `M`).
2. **Era II — Idade do Bronze & Talassocracias do Golfo**:
   - Ascensão do Berço Civilizacional de `K` ao redor do Golfo Interno; expansão marítima de `G` pelo arquipélago ocidental (formando o enclave crioulo `G/K`) e travessia do estreito oriental pela família `A`.
3. **Era III — Era do Ferro & Impérios de Passo**:
   - Domínio da metalurgia na Cadeia Boreal (`J`); fortificação dos passos da Grande Cordilheira Meridional entre `K`, `E` e os principados mercantis da costa `C`.
4. **Era IV — Era das Grandes Companhias e Rotas Transcontinentais**:
   - Integração comercial plena entre o Continente Principal, o Continente Austral (`D`, `F`, `A-Sul`) e os entrepostos árticos (`H/I`, `I/J`, `I/J/L`).

---

## 2. Contrato de Campos de Lore para o Inspetor Cartográfico
Ao criar ou expandir objetos em `settlements`, `kingdoms`, `civilizations` ou `routes`, inclua os seguintes campos opcionais de enriquecimento narrativo:
- `era` *(string)*: Era de fundação ou apogeu (ex: `"Era II — Idade do Bronze"`).
- `lore` *(string)*: Crônica histórica concisa e evocativa (2 a 4 frases) explicando a importância geopolítica, ecológica e cultural do local.
- `economy` *(string)*: Principais produtos, guildas mercantis ou tributos que sustentam a feição.
- `landmarks` *(array of strings)*: 1 a 3 marcos arquitetônicos, geográficos ou militares notáveis daquela localidade.
- `historicalEvents` *(array of objects)*: Lista de eventos `{ "year": "c. -420", "event": "Tratado do Sal entre G e K" }` para alimentar filtros de linha do tempo.
