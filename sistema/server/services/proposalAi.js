// Usa a API da Claude (Anthropic) para redigir automaticamente o parágrafo de
// "Escopo do projeto" do PDF do orçamento, com base nos produtos/serviços
// adicionados. É totalmente opcional: sem ANTHROPIC_API_KEY configurada (ou
// se a chamada falhar por qualquer motivo — rede, limite de uso, etc.), o
// PDF continua sendo gerado normalmente com o texto automático "sem IA" já
// existente (services/pdfService.js -> buildProjectScopeText).
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

function buildItemsList(items) {
  return items
    .map((item) => {
      const detail = item.catalog_description && item.catalog_description.trim() ? ` (${item.catalog_description.trim()})` : '';
      return `- ${item.quantity} ${item.unit || 'un'} de ${item.description}${detail}`;
    })
    .join('\n');
}

// Retorna o parágrafo gerado pela Claude, ou null se a integração estiver
// desativada ou a chamada falhar (nesse caso o chamador deve usar o texto
// automático padrão como alternativa).
async function generateProjectScope(items, notes) {
  const anthropic = getClient();
  if (!anthropic || !items || items.length === 0) return null;

  const prompt =
    'Você é um redator técnico de propostas comerciais de uma empresa de segurança eletrônica ' +
    '(CFTV, alarmes, controle de acesso, cercas elétricas, automação). Escreva UM único parágrafo, ' +
    'em português do Brasil, tom profissional e objetivo, descrevendo o escopo do projeto para um ' +
    'orçamento, usando exclusivamente os itens listados abaixo. Não invente itens que não estejam na ' +
    'lista, não use marcadores nem títulos — apenas um parágrafo corrido, com no máximo 90 palavras.\n\n' +
    `Itens do orçamento:\n${buildItemsList(items)}` +
    (notes && notes.trim() ? `\n\nObservações do responsável comercial: ${notes.trim()}` : '');

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
