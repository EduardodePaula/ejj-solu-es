// Prompt compartilhado pelos providers de IA (Claude e ChatGPT) usados para
// redigir o parágrafo de "Escopo do projeto" do PDF do orçamento.
function buildItemsList(items) {
  return items
    .map((item) => {
      const detail = item.catalog_description && item.catalog_description.trim() ? ` (${item.catalog_description.trim()})` : '';
      return `- ${item.quantity} ${item.unit || 'un'} de ${item.description}${detail}`;
    })
    .join('\n');
}

function buildProjectScopePrompt(items, notes) {
  return (
    'Você é um redator técnico de propostas comerciais de uma empresa de segurança eletrônica ' +
    '(CFTV, alarmes, controle de acesso, cercas elétricas, automação). Escreva UM único parágrafo, ' +
    'em português do Brasil, tom profissional e objetivo, descrevendo o escopo do projeto para um ' +
    'orçamento, usando exclusivamente os itens listados abaixo. Não invente itens que não estejam na ' +
    'lista, não use marcadores nem títulos — apenas um parágrafo corrido, com no máximo 90 palavras.\n\n' +
    `Itens do orçamento:\n${buildItemsList(items)}` +
    (notes && notes.trim() ? `\n\nObservações do responsável comercial: ${notes.trim()}` : '')
  );
}

module.exports = { buildProjectScopePrompt };
