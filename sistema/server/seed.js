const bcrypt = require('bcryptjs');
const db = require('./db');

function seed() {
  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount === 0) {
    const email = process.env.ADMIN_EMAIL || 'admin@ejjsolucoes.com.br';
    const password = process.env.ADMIN_PASSWORD || 'ejj@2026';
    const hash = bcrypt.hashSync(password, 10);
    db.prepare(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run('Administrador', email, hash, 'admin');
    console.log(`[seed] Usuário admin criado: ${email} / senha inicial: ${password}`);
  }

  const catalogCount = db.prepare('SELECT COUNT(*) AS c FROM catalog_items').get().c;
  if (catalogCount === 0) {
    const items = [
      ['Instalação de câmera CFTV (unidade)', 'servico', 350, 'un'],
      ['Instalação de alarme monitorado', 'servico', 600, 'un'],
      ['Instalação de cerca elétrica (metro)', 'servico', 45, 'm'],
      ['Instalação de controle de acesso', 'servico', 800, 'un'],
      ['Visita técnica avulsa', 'servico', 150, 'visita'],
      ['Manutenção preventiva (visita)', 'servico', 200, 'visita'],
      ['Manutenção corretiva (hora técnica)', 'servico', 120, 'hora'],
      ['Câmera IP Full HD', 'produto', 420, 'un'],
      ['DVR/NVR 8 canais', 'produto', 950, 'un'],
      ['Central de alarme monitorada', 'produto', 780, 'un'],
      ['Sensor de presença sem fio', 'produto', 90, 'un'],
      ['Cabo de rede/energia (metro)', 'produto', 3.5, 'm'],
    ];
    const insert = db.prepare(
      'INSERT INTO catalog_items (name, category, unit_price, unit) VALUES (?, ?, ?, ?)'
    );
    const insertMany = db.transaction((rows) => rows.forEach((r) => insert.run(...r)));
    insertMany(items);
    console.log(`[seed] ${items.length} itens de catálogo criados.`);
  }
}

seed();

module.exports = seed;
