// Provider "simulado": usado enquanto nenhuma integração bancária real foi
// configurada. Gera um registro de boleto com dados fictícios, mas com a MESMA
// estrutura que um provider real devolveria — assim o financeiro já funciona
// de ponta a ponta, e quando as credenciais do banco forem configuradas
// (variáveis INTER_* no .env, por exemplo) basta trocar BOLETO_PROVIDER que o
// restante do sistema não muda.
function randomDigits(n) {
  let s = '';
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10);
  return s;
}

async function emitBoleto(receivable, client) {
  const linhaDigitavel = `${randomDigits(5)}.${randomDigits(5)} ${randomDigits(5)}.${randomDigits(6)} ${randomDigits(5)}.${randomDigits(6)} ${randomDigits(1)} ${randomDigits(14)}`;

  return {
    provider: 'simulado',
    provider_status: 'aguardando_integracao_bancaria',
    nosso_numero: randomDigits(10),
    linha_digitavel: linhaDigitavel,
    barcode: randomDigits(44),
    pdf_url: null,
    raw_response: JSON.stringify({
      aviso:
        'Boleto gerado em modo simulado. Configure BOLETO_PROVIDER e as credenciais ' +
        'do seu banco (ver .env.example) para emitir boletos reais automaticamente.',
      receivable_id: receivable.id,
      client: client.name,
      amount: receivable.amount,
      due_date: receivable.due_date,
    }),
  };
}

module.exports = { emitBoleto };
