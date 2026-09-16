const simulated = require('./simulatedProvider');
const bancoInter = require('./bancoInterProvider');

// Fábrica de provider de boleto. Troque BOLETO_PROVIDER no .env quando tiver
// as credenciais reais do seu banco. Se o provider real não estiver
// configurado corretamente, cai automaticamente no modo simulado para não
// travar a operação do financeiro.
function getProvider() {
  const providerName = process.env.BOLETO_PROVIDER || 'simulado';

  if (providerName === 'banco_inter' && bancoInter.isConfigured()) {
    return bancoInter;
  }

  return simulated;
}

module.exports = { getProvider };
