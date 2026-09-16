// Busca dados públicos de uma empresa pelo CNPJ na BrasilAPI (gratuita, sem
// necessidade de chave de API) para pré-preencher o cadastro de cliente
// pessoa jurídica automaticamente.
const BRASILAPI_URL = 'https://brasilapi.com.br/api/cnpj/v1';

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

async function lookupCnpj(rawCnpj) {
  const cnpj = onlyDigits(rawCnpj);
  if (cnpj.length !== 14) {
    const err = new Error('CNPJ inválido: informe os 14 dígitos.');
    err.status = 400;
    throw err;
  }

  const response = await fetch(`${BRASILAPI_URL}/${cnpj}`);

  if (response.status === 404) {
    const err = new Error('CNPJ não encontrado.');
    err.status = 404;
    throw err;
  }
  if (!response.ok) {
    const err = new Error(`Falha ao consultar CNPJ (status ${response.status}).`);
    err.status = 502;
    throw err;
  }

  const data = await response.json();

  const phone = data.ddd_telefone_1 ? data.ddd_telefone_1.replace(/\D/g, '') : '';
  const address = [
    data.descricao_tipo_de_logradouro,
    data.logradouro,
    data.numero,
    data.complemento,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    name: data.razao_social || data.nome_fantasia || '',
    trade_name: data.nome_fantasia || '',
    document: cnpj,
    type: 'pessoa_juridica',
    email: data.email || '',
    phone,
    address: address || (data.bairro ? data.bairro : ''),
    city: data.municipio || '',
    state: data.uf || '',
    zip: data.cep || '',
  };
}

module.exports = { lookupCnpj };
