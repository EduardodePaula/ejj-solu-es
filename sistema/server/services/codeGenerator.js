const db = require('../db');

// Gera códigos sequenciais no formato PREFIXO-ANO-0001, reiniciando a cada ano.
function nextCode(prefix, table) {
  const year = new Date().getFullYear();
  const like = `${prefix}-${year}-%`;
  const row = db.prepare(`SELECT code FROM ${table} WHERE code LIKE ? ORDER BY id DESC LIMIT 1`).get(like);

  let seq = 1;
  if (row) {
    const parts = row.code.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }

  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}

module.exports = { nextCode };
