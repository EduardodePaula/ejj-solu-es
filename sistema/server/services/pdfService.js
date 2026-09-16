const path = require('path');
const PDFDocument = require('pdfkit');
const { getApplicableClauses, FREQUENCY_LABELS } = require('../clauseTemplates');

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'logo.jpg');

const NAVY = '#0b1130';
const BLUE = '#1c99e0';
const LIGHT_BLUE = '#aadcf7';
const TEXT = '#1a1a1a';
const MUTED = '#555555';

// Textos institucionais fixos do modelo de proposta comercial da EJJ
// Soluções — não variam de orçamento para orçamento.
const INTRO_PARAGRAPHS = [
  'A EJJ Soluções atua no segmento de Segurança Eletrônica oferecendo soluções completas em CFTV, Controle de Acesso, Redes Estruturadas, Interfonia, Alarmes e Automação.',
  'Trabalhamos com equipamentos de qualidade, mão de obra especializada e garantia dos serviços executados, buscando sempre entregar segurança, organização e tranquilidade aos nossos clientes.',
  'Agradecemos pela oportunidade de apresentar nossa proposta de serviços para a sua empresa. Nosso objetivo é fornecer soluções de segurança eletrônica personalizadas que ajudem a sua empresa a alcançar seus objetivos de crescimento e aumentar a sua segurança.',
];

const OBJECTIVE_TEXT =
  'Desenvolver e instalar um sistema de segurança eletrônica capaz de proporcionar monitoramento eficiente, aumento da segurança patrimonial e melhor controle das áreas monitoradas, utilizando equipamentos de alta qualidade e instalação conforme as normas técnicas.';

const SCOPE_ITEMS = [
  'Instalação de câmeras',
  'Configuração do DVR',
  'Organização do cabeamento',
  'Fixação das canaletas',
  'Identificação dos cabos',
  'Testes de funcionamento',
  'Configuração para acesso remoto',
  'Treinamento básico do cliente',
];

const EXCLUSION_ITEMS = ['Pintura', 'Gesso', 'Infraestrutura elétrica', 'Internet', 'Nobreak', 'Obras civis', 'Adequações estruturais'];

const WARRANTY_PARAGRAPHS = [
  'Todo serviço executado tem garantia no prazo de 90 (noventa) dias conforme Código de Defesa do Consumidor contra problemas de instalação a partir da data de conclusão do mesmo; a garantia dos equipamentos é fornecida pelo certificado de garantia do produto.',
  'A garantia fica estendida para 90 dias a contar da data do término da garantia legal prevista pelo Código de Defesa do Consumidor, e será feita sem qualquer ônus sobre o problema reclamado. Caso seja detectado que o problema reclamado seja de ordem fora das especificações da garantia, será cobrada uma taxa de deslocamento até o local e o nº de horas técnicas atendidas pelo profissional designado.',
  'A garantia não cobre qualquer problema de força maior, fenômenos extremos ou meteorológicos, tais como descargas elétricas, sobretensões, chuvas, raios e ventos, assim como vandalismo e/ou manuseio inadequado.',
  'Esta garantia será automaticamente cancelada se houver intervenção de pessoas não autorizadas a executarem o manuseio dos equipamentos.',
];

const WARRANTY_TABLE = [
  ['Serviços', '90 dias conforme CDC (Código de Defesa do Consumidor)'],
  ['Equipamentos', '12 meses conforme fabricante'],
  ['Suporte Técnico', 'Atendimento mediante agendamento'],
];

const EXECUTION_TEXT =
  'Prazo estimado para execução: até 5 dias úteis após a aprovação da proposta e disponibilidade dos materiais. O cronograma poderá ser antecipado conforme disponibilidade da equipe técnica.';

const PAYMENT_CONDITIONS = ['5% de desconto no PIX', 'Entrada de 50%', 'Parcelamento em até 7x (juros com a operadora)', 'Link de pagamento'];

const WHY_CHOOSE_ITEMS = [
  'Equipe especializada',
  'Atendimento rápido',
  'Equipamentos de qualidade',
  'Garantia dos serviços',
  'Suporte pós-venda',
  'Experiência em condomínios, empresas e residências',
];

function currency(v) {
  return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function money(v) {
  return `R$ ${currency(v)}`;
}

function contentWidth(doc) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function ensureSpace(doc, needed) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed > bottom) {
    doc.addPage();
  }
}

// Para tabelas desenhadas com coordenadas manuais (x, y), doc.y não avança
// sozinho — por isso a checagem de quebra de página precisa receber e
// devolver o "y" que a própria tabela está controlando, em vez de olhar
// para doc.y (que ficaria parado na posição de antes da tabela começar).
function ensureRowSpace(doc, y, needed, onPageBreak) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (y + needed > bottom) {
    doc.addPage();
    return onPageBreak ? onPageBreak(doc.page.margins.top) : doc.page.margins.top;
  }
  return y;
}

function sectionHeading(doc, text) {
  ensureSpace(doc, 30);
  doc.moveDown(0.8).fontSize(12).fillColor(NAVY).font('Helvetica-Bold').text(text);
  doc.moveDown(0.3).fillColor(TEXT).font('Helvetica');
}

function paragraph(doc, text, opts = {}) {
  ensureSpace(doc, 20);
  doc.fontSize(opts.fontSize || 10).fillColor(opts.color || TEXT).font(opts.bold ? 'Helvetica-Bold' : 'Helvetica');
  doc.text(text, { align: opts.align || 'justify' });
  doc.font('Helvetica');
}

function bulletList(doc, items, opts = {}) {
  const symbol = opts.symbol || '•';
  doc.fontSize(10).fillColor(TEXT).font('Helvetica');
  items.forEach((item) => {
    ensureSpace(doc, 16);
    doc.text(`${symbol}  ${item}`, { indent: 12 });
  });
}

// Desenha uma linha da tabela nas coordenadas atuais, avançando doc.y.
function drawRow(doc, x, y, colWidths, cells, opts = {}) {
  const { bg, textColor = TEXT, bold = false, fontSize = 9, align = 'left', height = 20, border = '#333333' } = opts;
  let curX = x;

  colWidths.forEach((w, i) => {
    if (bg) doc.rect(curX, y, w, height).fill(bg);
    if (border) doc.rect(curX, y, w, height).lineWidth(0.5).stroke(border);
    doc
      .fillColor(textColor)
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(fontSize)
      .text(String(cells[i] ?? ''), curX + 5, y + height / 2 - fontSize / 2 - 1, {
        width: w - 10,
        align: Array.isArray(align) ? align[i] : align,
      });
    curX += w;
  });

  return y + height;
}

// Tabela de itens (Produtos/Equipamentos ou Mão de obra), com cabeçalho azul
// e linha de total ao final — replica o estilo do modelo de proposta.
function drawItemsTable(doc, title, rows) {
  const width = contentWidth(doc);
  const colWidths = [width * 0.55, width * 0.1, width * 0.15, width * 0.2];
  const align = ['left', 'center', 'right', 'right'];

  ensureSpace(doc, 50);
  doc.fontSize(11).fillColor(NAVY).font('Helvetica-Bold').text(title);
  doc.moveDown(0.3);

  const x = doc.page.margins.left;
  const header = ['Produto/Serviço', 'Qt.', 'Valor Unitário', 'Valor Total'];
  const drawHeaderRow = (y) =>
    drawRow(doc, x, y, colWidths, header, { bg: BLUE, textColor: '#ffffff', bold: true, align });

  let y = drawHeaderRow(ensureRowSpace(doc, doc.y, 20));

  const total = rows.reduce((sum, r) => sum + r.total, 0);

  if (rows.length === 0) {
    y = ensureRowSpace(doc, y, 20, drawHeaderRow);
    y = drawRow(doc, x, y, colWidths, ['Nenhum item nesta categoria.', '', '', ''], { bg: LIGHT_BLUE, align });
  } else {
    rows.forEach((item) => {
      y = ensureRowSpace(doc, y, 20, drawHeaderRow);
      y = drawRow(doc, x, y, colWidths, [item.description, item.quantity, money(item.unit_price), money(item.total)], {
        bg: LIGHT_BLUE,
        align,
      });
    });
  }

  y = ensureRowSpace(doc, y, 20, drawHeaderRow);
  y = drawRow(doc, x, y, [colWidths[0] + colWidths[1] + colWidths[2], colWidths[3]], ['Valor Total', money(total)], {
    bg: NAVY,
    textColor: '#ffffff',
    bold: true,
    align: ['right', 'right'],
  });

  doc.x = doc.page.margins.left;
  doc.y = y + 12;
  return total;
}

function drawInvestmentTotal(doc, equipamentosTotal, servicosTotal) {
  const width = contentWidth(doc);
  const colWidths = [width / 3, width / 3, width / 3];
  const x = doc.page.margins.left;

  ensureSpace(doc, 60);
  doc.fontSize(12).fillColor(NAVY).font('Helvetica-Bold').text('Investimento Total');
  doc.moveDown(0.3);

  let y = ensureRowSpace(doc, doc.y, 40);
  y = drawRow(doc, x, y, colWidths, ['Equipamentos', 'Mão de Obra', 'Valor Total'], {
    bg: BLUE,
    textColor: '#ffffff',
    bold: true,
    align: 'center',
  });
  y = drawRow(doc, x, y, colWidths, [money(equipamentosTotal), money(servicosTotal), money(equipamentosTotal + servicosTotal)], {
    bg: LIGHT_BLUE,
    bold: true,
    align: 'center',
  });

  doc.x = doc.page.margins.left;
  doc.y = y + 12;
}

function drawFooters(doc) {
  const range = doc.bufferedPageRange();
  const footerText = 'EMPRESA: EJJ SOLUÇÕES  •  eduardo.rodrigues@ejjsolucoes.com.br  •  (11) 91481-3537 / (11) 98876-9474';

  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);

    // Escrever dentro da área de margem inferior faria o pdfkit achar que o
    // texto não cabe e criar uma página nova sozinho (para cada página já
    // existente!). Zeramos a margem temporariamente só para este texto.
    const originalBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    const y = doc.page.height - originalBottom + 15;
    doc
      .fontSize(8)
      .fillColor(MUTED)
      .font('Helvetica')
      .text(footerText, 50, y, { width: doc.page.width - 100, align: 'center' });

    doc.page.margins.bottom = originalBottom;
  }
}

function drawHeaderBand(doc, title, subtitle) {
  const width = doc.page.width;
  doc.rect(0, 0, width, 95).fill(NAVY);

  try {
    doc.image(LOGO_PATH, 50, 14, { height: 66 });
  } catch (err) {
    // Segue sem o logo caso o arquivo de imagem não esteja disponível.
  }

  doc
    .fillColor('#ffffff')
    .font('Helvetica-Bold')
    .fontSize(18)
    .text(title, 175, 28, { width: width - 225 })
    .font('Helvetica')
    .fontSize(11)
    .text(subtitle, 175, 52, { width: width - 225 });

  doc.y = 110;
  doc.fillColor(TEXT).font('Helvetica');
}

function renderBudgetPdf(res, budget, client, items) {
  const filename = `orcamento-${budget.code}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

  const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
  doc.pipe(res);

  drawHeaderBand(doc, 'Proposta Comercial', 'Sistema de Segurança Eletrônica');

  doc.fontSize(10).fillColor(TEXT).font('Helvetica-Bold');
  doc.text(`CLIENTE: ${(client.name || '').toUpperCase()}`);
  doc.text(`DATA: ${new Date(budget.created_at).toLocaleDateString('pt-BR')}`);
  doc.text(`PROPOSTA Nº: ${budget.code}`);
  doc.font('Helvetica');

  doc
    .moveDown(0.8)
    .strokeColor(BLUE)
    .lineWidth(1.5)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke();

  doc.moveDown(0.8).fontSize(13).fillColor(NAVY).font('Helvetica-Bold');
  doc.text('Proposta de Serviços de Instalação de Sistema de Segurança Eletrônica');
  doc.font('Helvetica').fillColor(TEXT);

  doc.moveDown(0.6);
  paragraph(doc, 'Prezado(a) Cliente,', { bold: true, align: 'left' });
  doc.moveDown(0.3);
  INTRO_PARAGRAPHS.forEach((p) => {
    paragraph(doc, p);
    doc.moveDown(0.4);
  });

  sectionHeading(doc, '1. Objetivo');
  paragraph(doc, OBJECTIVE_TEXT);

  sectionHeading(doc, '2. Escopo dos serviços');
  bulletList(doc, SCOPE_ITEMS);

  sectionHeading(doc, '2.1 Escopo do projeto');
  paragraph(doc, budget.notes && budget.notes.trim() ? budget.notes : 'A detalhar conforme visita técnica e itens orçados abaixo.');

  sectionHeading(doc, '3. Notas');
  paragraph(doc, 'Esta proposta não inclui serviços de:');
  bulletList(doc, EXCLUSION_ITEMS);
  doc.moveDown(0.2);
  paragraph(doc, 'Que deverão ser providenciados pelo cliente.');

  sectionHeading(doc, '4. Garantia');
  WARRANTY_PARAGRAPHS.forEach((p) => {
    paragraph(doc, p);
    doc.moveDown(0.3);
  });
  doc.moveDown(0.2);
  WARRANTY_TABLE.forEach(([label, value]) => {
    ensureSpace(doc, 16);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(TEXT).text(`${label}: `, { continued: true }).font('Helvetica').text(value);
  });

  sectionHeading(doc, 'Prazo de Execução');
  paragraph(doc, EXECUTION_TEXT);

  sectionHeading(doc, 'Validade da Proposta');
  paragraph(doc, `A validade desta proposta é de ${budget.validity_days} dias a contar da data de emissão.`);

  sectionHeading(doc, 'Condições de Pagamento');
  paragraph(doc, 'O pagamento deverá ser executado nas seguintes condições:');
  bulletList(doc, PAYMENT_CONDITIONS, { symbol: '•' });

  sectionHeading(doc, 'Orçamento');
  const produtos = items.filter((i) => i.category === 'produto');
  const servicos = items.filter((i) => i.category !== 'produto');
  const equipamentosTotal = drawItemsTable(doc, 'Equipamentos / Produtos', produtos);
  const servicosTotal = drawItemsTable(doc, 'Mão de obra / Serviços', servicos);
  drawInvestmentTotal(doc, equipamentosTotal, servicosTotal);

  ensureSpace(doc, 60);
  doc.fontSize(11).fillColor(TEXT);
  doc.text(`Subtotal: ${money(budget.subtotal)}`, { align: 'right' });
  if (budget.discount_value > 0) {
    doc.text(`Desconto (${budget.discount_pct}%): -${money(budget.discount_value)}`, { align: 'right' });
  }
  doc.fontSize(14).fillColor(NAVY).font('Helvetica-Bold').text(`Total do Orçamento: ${money(budget.total)}`, { align: 'right' });
  doc.font('Helvetica').fillColor(TEXT);

  sectionHeading(doc, 'Por que escolher a EJJ Soluções?');
  bulletList(doc, WHY_CHOOSE_ITEMS, { symbol: '•' });

  doc.moveDown(1);
  paragraph(doc, 'Agradecemos pela oportunidade de apresentar esta proposta e permanecemos à disposição para quaisquer esclarecimentos. Será um prazer contribuir para a segurança do seu patrimônio.');
  doc.moveDown(0.6);
  paragraph(doc, 'Atenciosamente,');

  ensureSpace(doc, 90);
  doc.moveDown(2);
  doc.text('________________________________');
  doc.font('Helvetica-Bold').text('Eduardo Rodrigues');
  doc.font('Helvetica').text('Gerente de Projetos');
  doc.moveDown(1.5);
  doc.text('________________________________');
  doc.text('Responsável Cliente');
  doc.text('Data da Aprovação: ___/___/___');

  drawFooters(doc);
  doc.end();
}

function renderContractPdf(res, contract, client) {
  const filename = `contrato-${contract.code}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

  const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
  doc.pipe(res);

  drawHeaderBand(doc, 'Contrato de Manutenção', 'Segurança Eletrônica e Automação');

  doc.fontSize(10).fillColor(TEXT).font('Helvetica-Bold');
  doc.text(`CONTRATANTE: ${(client.name || '').toUpperCase()}${client.document ? ' - DOC: ' + client.document : ''}`);
  doc.text(`CONTRATO Nº: ${contract.code}`);
  doc.text(`INÍCIO DA VIGÊNCIA: ${new Date(contract.start_date).toLocaleDateString('pt-BR')}`);
  doc.font('Helvetica');

  doc
    .moveDown(0.8)
    .strokeColor(BLUE)
    .lineWidth(1.5)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke();

  doc.moveDown(0.8).fontSize(13).fillColor(NAVY).font('Helvetica-Bold');
  doc.text('Contrato de Prestação de Serviços de Manutenção Preventiva');
  doc.font('Helvetica').fillColor(TEXT);

  doc.moveDown(0.6);
  paragraph(
    doc,
    `CONTRATADA: EJJ Soluções em Segurança Eletrônica. CONTRATANTE: ${client.name}${
      client.document ? ' (Doc: ' + client.document + ')' : ''
    }. As partes acima qualificadas firmam o presente contrato, que se regerá pelas cláusulas e condições a seguir.`
  );

  sectionHeading(doc, 'Resumo do Contrato');
  const summaryRows = [
    ['Frequência de manutenção', FREQUENCY_LABELS[contract.frequency] || contract.frequency],
    ['SLA de atendimento', `${contract.sla_hours} horas`],
    ['Valor mensal', money(contract.monthly_value)],
    ['Dia de vencimento', `Todo dia ${contract.payment_day}`],
    ['Vigência', `${contract.duration_months} meses (até ${new Date(contract.end_date).toLocaleDateString('pt-BR')})`],
    ['Renovação automática', contract.auto_renew ? 'Sim' : 'Não'],
  ];
  if (contract.equipment_covered) {
    summaryRows.push(['Equipamentos cobertos', contract.equipment_covered]);
  }
  summaryRows.forEach(([label, value]) => {
    ensureSpace(doc, 16);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(TEXT).text(`${label}: `, { continued: true }).font('Helvetica').text(value);
  });

  getApplicableClauses(contract, client).forEach((clause) => {
    sectionHeading(doc, clause.title);
    paragraph(doc, clause.body);
  });

  doc.moveDown(1);
  paragraph(
    doc,
    'E por estarem justas e contratadas, as partes assinam o presente instrumento, inclusive de forma eletrônica, para que produza seus efeitos legais.'
  );

  ensureSpace(doc, 110);
  doc.moveDown(2);
  doc.text('________________________________');
  doc.font('Helvetica-Bold').text('EJJ Soluções em Segurança Eletrônica');
  doc.font('Helvetica').text('Eduardo Rodrigues — Gerente de Projetos (CONTRATADA)');
  doc.moveDown(1.5);
  doc.text('________________________________');
  doc.font('Helvetica-Bold').text(client.name);
  doc.font('Helvetica').text('Responsável (CONTRATANTE)');

  drawFooters(doc);
  doc.end();
}

module.exports = { renderBudgetPdf, renderContractPdf, currency };
