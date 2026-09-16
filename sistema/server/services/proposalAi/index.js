// Fábrica de provider de IA para redigir o "Escopo do projeto" do PDF do
// orçamento. Troque AI_PROVIDER no .env para usar Claude (padrão) ou ChatGPT.
// Totalmente opcional: sem nenhuma chave configurada (ou se a chamada
// falhar por qualquer motivo — rede, limite de uso, chave inválida etc.), a
// função devolve null e o PDF cai automaticamente no texto automático "sem
// IA" já existente (services/pdfService.js -> buildProjectScopeText).
const claudeProvider = require('./claudeProvider');
const openaiProvider = require('./openaiProvider');

function getProvider() {
  const providerName = (process.env.AI_PROVIDER || 'claude').toLowerCase();

  if (providerName === 'openai' || providerName === 'chatgpt') {
    return openaiProvider;
  }
  return claudeProvider;
}

async function generateProjectScope(items, notes) {
  const provider = getProvider();
  return provider.generateProjectScope(items, notes);
}

// Chamado uma vez na subida do servidor para deixar claro nos logs se a
// redação por IA está realmente ativa (e com qual provedor) — sem isso, uma
// chave mal configurada só aparece como "o texto não mudou", sem nenhuma
// pista de por quê.
function logStatus() {
  const providerName = (process.env.AI_PROVIDER || 'claude').toLowerCase();
  const provider = getProvider();
  if (provider.isEnabled()) {
    console.log(`[proposalAi] Redação do escopo por IA ATIVA (provider: ${providerName}).`);
  } else {
    console.log(
      `[proposalAi] Redação do escopo por IA DESATIVADA (provider configurado: ${providerName}, mas sem chave válida) — usando texto automático sem IA.`
    );
  }
}

module.exports = { generateProjectScope, logStatus };
