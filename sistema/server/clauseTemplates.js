// Biblioteca de cláusulas usadas para montar contratos de manutenção preventiva
// automaticamente. Cada cláusula pode ter placeholders {{campo}} substituídos
// pelos dados do contrato, e uma condição "appliesWhen" que decide se ela entra
// no documento final.
//
// appliesWhen aceita:
//   "always"                -> sempre entra
//   "frequency:mensal"      -> só entra se contract.frequency === 'mensal'
//   "auto_renew:1" / "auto_renew:0"
//   "sla_lte:24"            -> só entra se sla_hours <= 24
//   "has_equipment"         -> só entra se equipment_covered estiver preenchido

const CLAUSES = [
  {
    key: 'objeto',
    title: 'Cláusula 1ª - Do Objeto',
    order_index: 10,
    appliesWhen: 'always',
    body:
      'O presente contrato tem como objeto a prestação de serviços de manutenção ' +
      'preventiva nos sistemas de segurança eletrônica e automação instalados nas ' +
      'dependências da CONTRATANTE, incluindo, mas não se limitando a, câmeras de ' +
      'CFTV, alarmes, controle de acesso, cercas elétricas e demais equipamentos ' +
      'relacionados, doravante denominados "Equipamentos".',
  },
  {
    key: 'escopo_equipamentos',
    title: 'Cláusula 2ª - Dos Equipamentos Cobertos',
    order_index: 20,
    appliesWhen: 'has_equipment',
    body:
      'Os serviços de manutenção preventiva previstos neste contrato abrangem ' +
      'especificamente os seguintes equipamentos e/ou sistemas: {{equipment_covered}}.',
  },
  {
    key: 'periodicidade',
    title: 'Cláusula 3ª - Da Periodicidade',
    order_index: 30,
    appliesWhen: 'always',
    body:
      'A manutenção preventiva será realizada com periodicidade {{frequency_label}}, ' +
      'mediante agendamento prévio com a CONTRATANTE, respeitando o horário comercial ' +
      'ou horário especial previamente acordado entre as partes.',
  },
  {
    key: 'sla',
    title: 'Cláusula 4ª - Do Prazo de Atendimento (SLA)',
    order_index: 40,
    appliesWhen: 'always',
    body:
      'Em caso de chamado técnico corretivo decorrente de mau funcionamento dos ' +
      'Equipamentos, a CONTRATADA se compromete a iniciar o atendimento em até ' +
      '{{sla_hours}} (horas) contadas a partir da abertura do chamado, salvo casos ' +
      'fortuitos ou de força maior.',
  },
  {
    key: 'obrigacoes_contratada',
    title: 'Cláusula 5ª - Das Obrigações da CONTRATADA',
    order_index: 50,
    appliesWhen: 'always',
    body:
      'A CONTRATADA obriga-se a: (a) executar os serviços com zelo, técnica e ' +
      'boas práticas do setor; (b) utilizar profissionais devidamente capacitados; ' +
      '(c) emitir relatório técnico a cada visita de manutenção preventiva; ' +
      '(d) comunicar à CONTRATANTE qualquer não conformidade, risco de falha ou ' +
      'necessidade de substituição de peças identificada durante as visitas.',
  },
  {
    key: 'obrigacoes_contratante',
    title: 'Cláusula 6ª - Das Obrigações da CONTRATANTE',
    order_index: 60,
    appliesWhen: 'always',
    body:
      'A CONTRATANTE obriga-se a: (a) permitir livre acesso dos técnicos da ' +
      'CONTRATADA aos locais de instalação dos Equipamentos, nos horários agendados; ' +
      '(b) manter os pagamentos em dia, conforme Cláusula 7ª; (c) não realizar ' +
      'intervenções técnicas nos Equipamentos por terceiros não autorizados sem ' +
      'prévia comunicação à CONTRATADA, sob pena de perda de garantia dos serviços.',
  },
  {
    key: 'pecas_materiais',
    title: 'Cláusula 7ª - De Peças e Materiais',
    order_index: 70,
    appliesWhen: 'always',
    body:
      'O presente contrato cobre exclusivamente a mão de obra referente à ' +
      'manutenção preventiva. Eventuais peças, componentes ou materiais de ' +
      'reposição necessários serão orçados separadamente e somente substituídos ' +
      'mediante aprovação prévia e expressa da CONTRATANTE.',
  },
  {
    key: 'valor_pagamento',
    title: 'Cláusula 8ª - Do Valor e Forma de Pagamento',
    order_index: 80,
    appliesWhen: 'always',
    body:
      'Pela prestação dos serviços descritos neste contrato, a CONTRATANTE pagará ' +
      'à CONTRATADA o valor mensal de R$ {{monthly_value}}, com vencimento todo dia ' +
      '{{payment_day}} de cada mês, mediante boleto bancário emitido pela CONTRATADA.',
  },
  {
    key: 'reajuste',
    title: 'Cláusula 9ª - Do Reajuste',
    order_index: 90,
    appliesWhen: 'always',
    body:
      'O valor mensal pactuado poderá ser reajustado anualmente com base na ' +
      'variação acumulada do IPCA (ou outro índice que venha a substituí-lo), ' +
      'ou por livre negociação entre as partes.',
  },
  {
    key: 'vigencia_renovacao_auto',
    title: 'Cláusula 10ª - Da Vigência e Renovação',
    order_index: 100,
    appliesWhen: 'auto_renew:1',
    body:
      'O presente contrato terá vigência de {{duration_months}} meses, contados a ' +
      'partir de {{start_date_label}}, sendo renovado automaticamente por períodos ' +
      'iguais e sucessivos, salvo manifestação em contrário por qualquer das partes, ' +
      'por escrito, com antecedência mínima de 30 (trinta) dias do término da vigência.',
  },
  {
    key: 'vigencia_sem_renovacao_auto',
    title: 'Cláusula 10ª - Da Vigência',
    order_index: 100,
    appliesWhen: 'auto_renew:0',
    body:
      'O presente contrato terá vigência de {{duration_months}} meses, contados a ' +
      'partir de {{start_date_label}}, encerrando-se automaticamente ao final deste ' +
      'período, podendo ser renovado mediante novo instrumento firmado entre as partes.',
  },
  {
    key: 'rescisao',
    title: 'Cláusula 11ª - Da Rescisão',
    order_index: 110,
    appliesWhen: 'always',
    body:
      'Qualquer das partes poderá rescindir o presente contrato mediante aviso ' +
      'prévio por escrito com antecedência mínima de 30 (trinta) dias, sem prejuízo ' +
      'do pagamento dos serviços já prestados até a data da rescisão. O atraso ' +
      'superior a 60 (sessenta) dias no pagamento autoriza a rescisão imediata pela ' +
      'CONTRATADA, independentemente de aviso prévio.',
  },
  {
    key: 'confidencialidade',
    title: 'Cláusula 12ª - Da Confidencialidade e Proteção de Dados',
    order_index: 120,
    appliesWhen: 'always',
    body:
      'As partes se comprometem a manter sigilo sobre quaisquer informações ' +
      'técnicas, comerciais ou de segurança obtidas em razão deste contrato, ' +
      'observando ainda as disposições da Lei nº 13.709/2018 (LGPD) no tratamento ' +
      'de dados pessoais eventualmente acessados durante a prestação dos serviços.',
  },
  {
    key: 'foro',
    title: 'Cláusula 13ª - Do Foro',
    order_index: 130,
    appliesWhen: 'always',
    body:
      'Fica eleito o foro da comarca de domicílio da CONTRATADA para dirimir ' +
      'quaisquer dúvidas ou controvérsias oriundas do presente contrato, com ' +
      'renúncia expressa a qualquer outro, por mais privilegiado que seja.',
  },
];

const FREQUENCY_LABELS = {
  semanal: 'semanal',
  quinzenal: 'quinzenal',
  mensal: 'mensal',
  bimestral: 'bimestral',
  trimestral: 'trimestral',
  semestral: 'semestral',
  anual: 'anual',
};

function clauseApplies(appliesWhen, contract) {
  if (appliesWhen === 'always') return true;
  if (appliesWhen === 'has_equipment') return !!(contract.equipment_covered && contract.equipment_covered.trim());
  if (appliesWhen.startsWith('frequency:')) return contract.frequency === appliesWhen.split(':')[1];
  if (appliesWhen.startsWith('auto_renew:')) return String(contract.auto_renew) === appliesWhen.split(':')[1];
  if (appliesWhen.startsWith('sla_lte:')) return Number(contract.sla_hours) <= Number(appliesWhen.split(':')[1]);
  return true;
}

function fillPlaceholders(text, contract, client) {
  const startDate = new Date(contract.start_date);
  const startDateLabel = isNaN(startDate.getTime())
    ? contract.start_date
    : startDate.toLocaleDateString('pt-BR');

  const values = {
    equipment_covered: contract.equipment_covered || '',
    frequency_label: FREQUENCY_LABELS[contract.frequency] || contract.frequency,
    sla_hours: contract.sla_hours,
    monthly_value: Number(contract.monthly_value || 0).toFixed(2).replace('.', ','),
    payment_day: contract.payment_day,
    duration_months: contract.duration_months,
    start_date_label: startDateLabel,
    client_name: client ? client.name : '',
  };

  return text.replace(/{{\s*(\w+)\s*}}/g, (_, key) => (values[key] !== undefined ? values[key] : ''));
}

// Monta o texto completo do contrato, selecionando apenas as cláusulas
// aplicáveis aos parâmetros informados e substituindo os placeholders.
function generateContractText(contract, client) {
  const applicable = CLAUSES
    .filter((c) => clauseApplies(c.appliesWhen, contract))
    .sort((a, b) => a.order_index - b.order_index);

  const header =
    `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE MANUTENÇÃO PREVENTIVA Nº ${contract.code}\n\n` +
    `CONTRATADA: EJJ Soluções em Segurança Eletrônica\n` +
    `CONTRATANTE: ${client ? client.name : ''}${client && client.document ? ' - Doc: ' + client.document : ''}\n` +
    `Data de início: ${new Date(contract.start_date).toLocaleDateString('pt-BR')}\n\n` +
    'As partes acima qualificadas firmam o presente contrato, que se regerá pelas ' +
    'cláusulas e condições a seguir:\n';

  const body = applicable
    .map((c) => `\n${c.title}\n${fillPlaceholders(c.body, contract, client)}\n`)
    .join('');

  const footer =
    '\n\nE por estarem justas e contratadas, as partes assinam o presente instrumento, ' +
    'inclusive de forma eletrônica, para que produza seus efeitos legais.';

  return header + body + footer;
}

module.exports = { CLAUSES, generateContractText, FREQUENCY_LABELS };
