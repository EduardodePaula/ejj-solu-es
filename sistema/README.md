# Sistema EJJ Soluções — Gestão de Clientes, Orçamentos, OS, Financeiro e Contratos

Aplicação web para gerenciar o dia a dia da EJJ Soluções:

- **Clientes**: cadastro completo (pessoa física/jurídica, contatos, endereço).
- **Catálogo**: serviços e produtos com preço unitário.
- **Orçamentos automáticos**: monte um orçamento escolhendo cliente + itens do
  catálogo (ou avulsos); o sistema calcula subtotal, desconto e total sozinho,
  gera o código (ORC-AAAA-0001) e o PDF.
- **Ordens de Serviço**: geradas **automaticamente** assim que um orçamento é
  aprovado, já com o valor e os itens copiados.
- **Financeiro**: contas a receber criadas automaticamente na aprovação do
  orçamento (e mensalmente para contratos ativos), com emissão de boleto por
  um provider plugável (veja abaixo).
- **Contratos de manutenção preventiva**: geração automática do contrato
  completo, com cláusulas selecionadas conforme os parâmetros informados
  (frequência, SLA, equipamentos cobertos, renovação automática etc.).

## Stack

- Backend: Node.js + Express + SQLite (`better-sqlite3`) — API REST em `server/`.
- Frontend: React + Vite — SPA em `client/`, buildado como arquivos estáticos
  servidos pelo próprio backend (uma única aplicação Node para publicar).

## Rodando localmente

```bash
# Backend
cd server
cp .env.example .env    # ajuste os valores, principalmente ADMIN_PASSWORD e JWT_SECRET
npm install
npm start                # http://localhost:4000 — cria o usuário admin e o catálogo inicial na 1ª execução

# Frontend (em outro terminal, para desenvolvimento com hot-reload)
cd client
npm install
npm run dev               # http://localhost:5173, com proxy para a API em :4000
```

Para gerar a build de produção do frontend (o backend já serve esses arquivos
automaticamente a partir de `client/dist`):

```bash
cd client
npm run build
```

Depois disso, rodando `npm start` dentro de `server/`, o sistema completo (API
+ frontend) fica disponível numa única porta.

Login inicial: o e-mail e a senha definidos em `ADMIN_EMAIL`/`ADMIN_PASSWORD`
no `.env` (usados apenas na primeira execução, quando o banco está vazio).
Troque a senha inicial no `.env` **antes** de rodar pela primeira vez.

## Publicando na hospedagem cPanel (Node.js App / Passenger)

A maioria dos cPanels atuais tem a opção **"Setup Node.js App"**, que roda a
aplicação via Passenger sem precisar de VPS.

1. Envie a pasta `sistema/` para o seu cPanel (Git Version Control, ou upload via File Manager/FTP).
2. Em **Setup Node.js App**, clique em "Create Application":
   - **Node.js version**: 18 ou superior.
   - **Application mode**: Production.
   - **Application root**: `sistema/server`.
   - **Application URL**: o domínio/subdomínio ou subpasta desejada (ex: `sistema.ejjsolucoes.com.br` ou `ejjsolucoes.com.br/sistema`).
   - **Application startup file**: `index.js`.
3. Na tela da aplicação criada, defina as **variáveis de ambiente** (mesmas do `.env.example`): `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CRON_SECRET`, `BOLETO_PROVIDER` e, se for o caso, as `INTER_*`.
4. Abra o terminal da aplicação (botão disponível na própria tela do Node.js App) e rode:
   ```bash
   cd ~/caminho/da/app/server && npm install --production
   cd ../client && npm install && npm run build
   ```
5. Reinicie a aplicação pelo painel ("Restart").
6. Acesse a URL configurada e faça login com o usuário/senha definidos.

### Geração automática das mensalidades de contrato (Cron Job do cPanel)

Como a aplicação roda sob Passenger (não fica um processo Node "sempre ativo"
rodando tarefas agendadas), a geração mensal das contas a receber dos
contratos ativos é feita por um endpoint (`/api/cron/generate-contract-receivables`)
que deve ser chamado uma vez por dia. Configure em **cPanel > Cron Jobs**:

- Frequência: uma vez por dia (ex: todo dia às 06:00).
- Comando:
  ```bash
  curl -s -X POST -H "x-cron-secret: SEU_CRON_SECRET" https://SEUDOMINIO/api/cron/generate-contract-receivables
  ```

O endpoint verifica, para cada contrato ativo, se já existe uma conta a
receber gerada para o mês corrente — se sim, não duplica.

## Emissão de boletos direto no banco

A emissão de boleto usa um **adapter plugável**
(`server/services/boletoProviders/`), para você poder trocar de banco sem
mexer no resto do sistema:

- `simulado` (padrão): gera um registro de boleto com linha digitável/código
  de barras fictícios, deixando todo o fluxo do financeiro funcional mesmo
  sem credenciais bancárias configuradas ainda. O status do boleto fica como
  `aguardando_integracao_bancaria`.
- `banco_inter`: implementação de exemplo usando a API de Cobrança do Banco
  Inter (OAuth2 + certificado mTLS). Para ativar:
  1. No Internet Banking do Inter, gere as credenciais de API (client_id,
     client_secret) e baixe o certificado + chave privada em **API > Cobrança**.
  2. Salve os arquivos `.pem` em `server/certs/` (pasta já ignorada pelo git).
  3. No `.env`, defina `BOLETO_PROVIDER=banco_inter` e preencha as variáveis
     `INTER_CLIENT_ID`, `INTER_CLIENT_SECRET`, `INTER_CERT_PATH`, `INTER_KEY_PATH`,
     `INTER_CONTA_CORRENTE`.
  4. Reinicie a aplicação.

Se você usa outro banco (Itaú, Bradesco, BB, Sicoob) ou prefere um gateway
como Asaas/Efí/Iugu, crie um novo arquivo em
`server/services/boletoProviders/` seguindo o mesmo contrato — uma função
`emitBoleto(receivable, client)` que devolve
`{ provider, provider_status, nosso_numero, linha_digitavel, barcode, pdf_url, raw_response }`
— e registre-o em `boletoProviders/index.js`. O restante do sistema (rotas,
financeiro, dashboard) não precisa mudar.

## Estrutura de pastas

```
sistema/
  server/                  API Node/Express + SQLite
    routes/                clientes, catálogo, orçamentos, OS, financeiro, contratos, dashboard, cron
    services/              regras de negócio (cálculo de orçamento, geração de código,
                            contratos/cláusulas, financeiro, boletos, PDF)
    clauseTemplates.js      biblioteca de cláusulas usadas na geração automática de contratos
    db.js / seed.js         schema SQLite e dados iniciais
  client/                  Frontend React (Vite)
    src/pages/             telas do sistema
    src/components/        layout/menu
```

## Próximos passos sugeridos

- Trocar `simulado` pela integração real assim que você definir o banco/gateway.
- Adicionar upload de fotos/relatório técnico nas Ordens de Serviço.
- Enviar orçamentos/contratos por e-mail automaticamente (hoje o PDF é gerado sob demanda).
- Tela de troca de senha do usuário (hoje a senha inicial é definida via `.env`).
