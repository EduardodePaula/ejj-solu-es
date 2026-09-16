// Busca dados públicos de uma empresa pelo CNPJ para pré-preencher o cadastro
// de cliente pessoa jurídica automaticamente. Tenta a BrasilAPI primeiro e,
// se falhar (fora do ar, rate limit, timeout), cai para a ReceitaWS — ambas
// gratuitas e sem necessidade de chave de API.
function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

async function fetchWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // Sem um User-Agent "de navegador", a proteção anti-bot (Cloudflare) na
    // frente dessas APIs costuma responder 403 a requisições feitas por
    // clientes HTTP genéricos (curl, undici/fetch do Node etc.).
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function buildAddress(parts) {
  return parts.filter(Boolean).join(' ').trim();
}

async function fromBrasilApi(cnpj) {
  const response = await fetchWithTimeout(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);

  if (response.status === 404) {
    const err = new Error('CNPJ não encontrado.');
    err.status = 404;
    err.notFound = true;
    throw err;
  }
  if (!response.ok) {
    throw new Error(`BrasilAPI respondeu status ${response.status}`);
  }

  const data = await response.json();
  const phone = data.ddd_telefone_1 ? data.ddd_telefone_1.replace(/\D/g, '') : '';

  return {
    name: data.razao_social || data.nome_fantasia || '',
    trade_name: data.nome_fantasia || '',
    document: cnpj,
    type: 'pessoa_juridica',
    email: data.email || '',
    phone,
    address:
      buildAddress([data.descricao_tipo_de_logradouro, data.logradouro, data.numero, data.complemento]) ||
      data.bairro ||
      '',
    city: data.municipio || '',
    state: data.uf || '',
    zip: data.cep || '',
  };
}

async function fromReceitaWs(cnpj) {
  const response = await fetchWithTimeout(`https://www.receitaws.com.br/v1/cnpj/${cnpj}`);

  if (!response.ok) {
    throw new Error(`ReceitaWS respondeu status ${response.status}`);
  }

  const data = await response.json();
  if (data.status === 'ERROR') {
    const err = new Error(data.message || 'CNPJ não encontrado.');
    err.status = 404;
    err.notFound = true;
    throw err;
  }

  return {
    name: data.nome || data.fantasia || '',
    trade_name: data.fantasia || '',
    document: cnpj,
    type: 'pessoa_juridica',
    email: data.email || '',
    phone: onlyDigits(data.telefone).slice(0, 11),
    address: buildAddress([data.logradouro, data.numero, data.complemento]) || data.bairro || '',
    city: data.municipio || '',
    state: data.uf || '',
    zip: onlyDigits(data.cep),
  };
}

async function lookupCnpj(rawCnpj) {
  const cnpj = onlyDigits(rawCnpj);
  if (cnpj.length !== 14) {
    const err = new Error('CNPJ inválido: informe os 14 dígitos.');
    err.status = 400;
    throw err;
  }

  const attempts = [
    ['BrasilAPI', fromBrasilApi],
    ['ReceitaWS', fromReceitaWs],
  ];

  let lastError;
  for (const [providerName, fn] of attempts) {
    try {
      return await fn(cnpj);
    } catch (err) {
      if (err.notFound) throw err; // CNPJ realmente não existe, não adianta tentar o próximo provider
      lastError = err;
      console.warn(`[cnpjLookup] Falha ao consultar ${providerName}: ${err.message}`);
    }
  }

  const err = new Error(
    `Não foi possível consultar o CNPJ agora (${lastError?.message || 'erro desconhecido'}). ` +
      'Verifique a conexão com a internet do servidor e tente novamente, ou preencha os dados manualmente.'
  );
  err.status = 502;
  throw err;
}

module.exports = { lookupCnpj };
