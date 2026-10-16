/**
 * Cliente de integração direta com o Gemini 3.8 Flash no Antigravity
 * Utiliza Structured Outputs para criar/atualizar camadas do Mapex.
 */
export class MapexGeminiClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.model = 'gemini-3.8-flash';
    this.endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
  }

  async generateLayerFeatures({ agentRole, targetLayer, userPrompt, currentWorldData }) {
    const systemInstruction = `Você é o agente ${agentRole} do framework Mapex.
Respeite a geografia de 107937.jpg e as famílias macrolinguísticas A-M de 107938.jpg.
Retorne exclusivamente um array JSON válido para a camada '${targetLayer}'.`;

    const response = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{
          role: 'user',
          parts: [{
            text: `Estado atual resumido: ${JSON.stringify(currentWorldData.layers[targetLayer])}
Pedido: ${userPrompt}`
          }]
        }],
        generationConfig: {
          temperature: 0.25,
          responseMimeType: 'application/json'
        }
      })
    });

    const data = await response.json();
    return JSON.parse(data.candidates[0].content.parts[0].text);
  }
}
