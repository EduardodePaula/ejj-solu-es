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

module.exports = { generateProjectScope };
