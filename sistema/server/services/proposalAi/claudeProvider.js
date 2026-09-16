// Usa a API da Claude (Anthropic) para redigir automaticamente o parágrafo de
// "Escopo do projeto" do PDF do orçamento, com base nos produtos/serviços
// adicionados.
const { buildProjectScopePrompt } = require('./promptBuilder');

let Anthropic;
try {
  Anthropic = require('@anthropic-ai/sdk');
} catch (err) {
  Anthropic = null;
}

let client = null;
function getClient() {
  if (!Anthropic || !process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic();
  return client;
}

function isEnabled() {
  return !!getClient();
}

// Retorna o parágrafo gerado, ou null se a integração estiver desativada ou
// a chamada falhar (nesse caso o chamador deve usar o texto automático como
// alternativa).
async function generateProjectScope(items, notes) {
  const anthropic = getClient();
  if (!anthropic || !items || items.length === 0) return null;

  const prompt = buildProjectScopePrompt(items, notes);

  try {
    // Timeout curto: sem isso, uma falha silenciosa de rede poderia travar a
    // geração do PDF por até 10 minutos (timeout padrão do SDK) em vez de
    // cair no texto automático sem IA.
    const response = await anthropic.messages.create(
      {
        model: 'claude-opus-5',
        max_tokens: 500,
        output_config: { effort: 'low' },
        messages: [{ role: 'user', content: prompt }],
      },
      { timeout: 15000 }
    );

    const textBlock = response.content.find((block) => block.type === 'text');
    const text = textBlock && textBlock.text ? textBlock.text.trim() : '';
    return text || null;
  } catch (err) {
    console.warn(`[proposalAi] Falha ao gerar escopo do projeto via Claude: ${err.message}`);
    return null;
  }
}

module.exports = { generateProjectScope, isEnabled };
