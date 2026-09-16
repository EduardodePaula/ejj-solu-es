// Usa a API do ChatGPT (OpenAI) como alternativa à Claude para redigir o
// parágrafo de "Escopo do projeto" do PDF do orçamento.
const { buildProjectScopePrompt } = require('./promptBuilder');

let OpenAI;
try {
  OpenAI = require('openai');
} catch (err) {
  OpenAI = null;
}

let client = null;
function getClient() {
  if (!OpenAI || !process.env.OPENAI_API_KEY) return null;
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

function isEnabled() {
  return !!getClient();
}

async function generateProjectScope(items, notes) {
  const openai = getClient();
  if (!openai || !items || items.length === 0) return null;

  const prompt = buildProjectScopePrompt(items, notes);

  try {
    const response = await openai.chat.completions.create(
      {
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      },
      { timeout: 15000 }
    );

    const text = response.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch (err) {
    console.warn(`[proposalAi] Falha ao gerar escopo do projeto via ChatGPT: ${err.message}`);
    return null;
  }
}

module.exports = { generateProjectScope, isEnabled };
