const PDFDocument = require('pdfkit');

function currency(v) {
  return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function streamPdf(res, filename, drawFn) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);
  drawFn(doc);
  doc.end();
}

function drawHeader(doc, title) {
  doc
    .fontSize(16)
    .fillColor('#23b76c')
    .text('EJJ Soluções em Segurança Eletrônica', { align: 'left' })
    .fontSize(10)
    .fillColor('#666')
    .text('www.ejjsolucoes.com.br  •  contato@ejjsolucoes.com.br')
    .moveDown(1)
    .fillColor('#000')
    .fontSize(14)
    .text(title, { align: 'left' })
    .moveDown(0.5)
    .strokeColor('#23b76c')
    .lineWidth(1.5)
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .stroke()
    .moveDown(1);
}

function renderBudgetPdf(res, budget, client, items) {
  streamPdf(res, `orcamento-${budget.code}.pdf`, (doc) => {
    drawHeader(doc, `Orçamento ${budget.code}`);

    doc.fontSize(11).fillColor('#000');
    doc.text(`Cliente: ${client.name}`);
    if (client.document) doc.text(`Documento: ${client.document}`);
    if (client.phone) doc.text(`Telefone: ${client.phone}`);
    if (client.email) doc.text(`E-mail: ${client.email}`);
    doc.text(`Data de emissão: ${new Date(budget.created_at).toLocaleDateString('pt-BR')}`);
    doc.text(`Validade: ${budget.validity_days} dias`);
    doc.moveDown(1);

    doc.fontSize(12).text('Itens do orçamento', { underline: true });
    doc.moveDown(0.5);

    items.forEach((item) => {
      doc
        .fontSize(10)
        .text(
          `${item.description}  —  Qtd: ${item.quantity}  x  R$ ${currency(item.unit_price)}  =  R$ ${currency(item.total)}`
        );
    });

    doc.moveDown(1);
    doc.fontSize(11).text(`Subtotal: R$ ${currency(budget.subtotal)}`, { align: 'right' });
    if (budget.discount_value > 0) {
      doc.text(`Desconto (${budget.discount_pct}%): R$ ${currency(budget.discount_value)}`, { align: 'right' });
    }
    doc.fontSize(13).fillColor('#23b76c').text(`Total: R$ ${currency(budget.total)}`, { align: 'right' });

    if (budget.notes) {
      doc.moveDown(1).fontSize(10).fillColor('#000').text(`Observações: ${budget.notes}`);
    }

    doc.moveDown(2).fontSize(9).fillColor('#666').text(
      'Este orçamento não constitui garantia de reserva de agenda. A confirmação do serviço se dá mediante aprovação formal.'
    );
  });
}

function renderContractPdf(res, contract, client) {
  streamPdf(res, `contrato-${contract.code}.pdf`, (doc) => {
    doc.fontSize(11).fillColor('#000');
    (contract.generated_text || '').split('\n').forEach((line) => {
      if (/^CONTRATO DE/.test(line)) {
        doc.moveDown(0.5).fontSize(13).text(line, { align: 'center' }).fontSize(11).moveDown(0.5);
      } else if (/^Cláusula/.test(line)) {
        doc.moveDown(0.8).fontSize(11).fillColor('#23b76c').text(line).fillColor('#000');
      } else {
        doc.fontSize(10).text(line);
      }
    });
  });
}

module.exports = { renderBudgetPdf, renderContractPdf, currency };
