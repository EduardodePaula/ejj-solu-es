// Integração com a API de Cobrança (boletos) do Banco Inter.
//
// Para ativar, defina no .env:
//   BOLETO_PROVIDER=banco_inter
//   INTER_CLIENT_ID=...
//   INTER_CLIENT_SECRET=...
//   INTER_CERT_PATH=./certs/inter-cert.pem     (certificado mTLS baixado no Internet Banking > API)
//   INTER_KEY_PATH=./certs/inter-key.pem       (chave privada correspondente)
//   INTER_CONTA_CORRENTE=...                    (opcional, se sua conta tiver mais de uma conta corrente)
//   INTER_CEDENTE_CNPJ=...                      (CNPJ/CPF cadastrado como beneficiário no Inter)
//
// IMPORTANTE: a API do Banco Inter exige certificado mTLS + OAuth2. Antes de
// usar em produção, confirme os nomes de campos atuais na documentação oficial
// (https://developers.bancointer.com.br), pois bancos costumam versionar essas
// APIs. Esta implementação segue o formato documentado da API de Cobrança v3.
const fs = require('fs');
const https = require('https');

const TOKEN_URL = 'https://cdpj.partners.bancointer.com.br/oauth/v2/token';
const API_BASE = 'https://cdpj.partners.bancointer.com.br/cobranca/v3/cobrancas';

function isConfigured() {
  return !!(
    process.env.INTER_CLIENT_ID &&
    process.env.INTER_CLIENT_SECRET &&
    process.env.INTER_CERT_PATH &&
    process.env.INTER_KEY_PATH &&
    fs.existsSync(process.env.INTER_CERT_PATH) &&
    fs.existsSync(process.env.INTER_KEY_PATH)
  );
}

function getAgent() {
  return new https.Agent({
    cert: fs.readFileSync(process.env.INTER_CERT_PATH),
    key: fs.readFileSync(process.env.INTER_KEY_PATH),
  });
}

function requestJson(url, options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
          else reject(new Error(`Banco Inter respondeu ${res.statusCode}: ${data}`));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getAccessToken() {
  const agent = getAgent();
  const body = new URLSearchParams({
    client_id: process.env.INTER_CLIENT_ID,
    client_secret: process.env.INTER_CLIENT_SECRET,
    grant_type: 'client_credentials',
    scope: 'cobranca-cob.write cobranca-cob.read',
  }).toString();

  const url = new URL(TOKEN_URL);
  const response = await requestJson(
    url,
    {
      method: 'POST',
      agent,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    },
    body
  );

  return response.access_token;
}

async function emitBoleto(receivable, client) {
  if (!isConfigured()) {
    throw new Error(
      'Integração com Banco Inter não configurada. Defina INTER_CLIENT_ID, INTER_CLIENT_SECRET, ' +
        'INTER_CERT_PATH e INTER_KEY_PATH no .env (veja .env.example).'
    );
  }

  const agent = getAgent();
  const token = await getAccessToken();

  const payload = JSON.stringify({
    seuNumero: receivable.code,
    valorNominal: Number(receivable.amount).toFixed(2),
    dataVencimento: receivable.due_date,
    numDiasAgenda: 60,
    pagador: {
      cpfCnpj: (client.document || '').replace(/\D/g, ''),
      tipoPessoa: client.type === 'pessoa_juridica' ? 'JURIDICA' : 'FISICA',
      nome: client.name,
      endereco: client.address || 'Não informado',
      cidade: client.city || 'Não informado',
      uf: client.state || 'SP',
      cep: (client.zip || '').replace(/\D/g, '') || '00000000',
    },
    mensagem: {
      linha1: 'Referente a serviços EJJ Soluções',
    },
  });

  const url = new URL(API_BASE);
  const response = await requestJson(
    url,
    {
      method: 'POST',
      agent,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        Authorization: `Bearer ${token}`,
        'x-conta-corrente': process.env.INTER_CONTA_CORRENTE || '',
      },
    },
    payload
  );

  return {
    provider: 'banco_inter',
    provider_status: 'emitido',
    nosso_numero: response.nossoNumero || response.codigoSolicitacao || null,
    linha_digitavel: response.linhaDigitavel || null,
    barcode: response.codigoBarras || null,
    pdf_url: response.pdfUrl || null,
    raw_response: JSON.stringify(response),
  };
}

module.exports = { emitBoleto, isConfigured };
