#!/usr/bin/env bash
# Instalador do Sistema EJJ Soluções para Kali Linux / Debian.
#
# Uso:
#   ./install.sh                 instalação interativa (pergunta e-mail/senha do admin)
#   ./install.sh --start         instala e já deixa rodando em primeiro plano (npm start)
#   ./install.sh --pm2           instala e configura para rodar sempre em segundo plano via PM2
#   ./install.sh --non-interactive   usa valores padrão/variáveis de ambiente, sem perguntar nada
#
# Variáveis de ambiente aceitas (úteis com --non-interactive):
#   ADMIN_EMAIL, ADMIN_PASSWORD, PORT

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/server"
CLIENT_DIR="$SCRIPT_DIR/client"

RUN_START=false
RUN_PM2=false
NON_INTERACTIVE=false

for arg in "$@"; do
  case "$arg" in
    --start) RUN_START=true ;;
    --pm2) RUN_PM2=true ;;
    --non-interactive) NON_INTERACTIVE=true ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Argumento desconhecido: $arg" >&2
      exit 1
      ;;
  esac
done

info()    { echo -e "\033[1;34m[info]\033[0m $*"; }
success() { echo -e "\033[1;32m[ok]\033[0m $*"; }
warn()    { echo -e "\033[1;33m[aviso]\033[0m $*"; }
fail()    { echo -e "\033[1;31m[erro]\033[0m $*" >&2; exit 1; }

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

# ---------------------------------------------------------------------------
# 1) Node.js 18+
# ---------------------------------------------------------------------------
NEED_NODE_INSTALL=true
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -v | sed 's/^v//' | cut -d. -f1)"
  if [ "$NODE_MAJOR" -ge 18 ]; then
    NEED_NODE_INSTALL=false
    success "Node.js $(node -v) já instalado."
  else
    warn "Node.js $(node -v) é antigo demais (precisa de 18+). Vou atualizar."
  fi
fi

if [ "$NEED_NODE_INSTALL" = true ]; then
  info "Instalando Node.js 20.x via NodeSource (pode pedir sua senha do sudo)..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO bash -
  $SUDO apt-get install -y nodejs
  success "Node.js $(node -v) instalado."
fi

# ---------------------------------------------------------------------------
# 2) Dependências de build (better-sqlite3 compila um binário nativo)
# ---------------------------------------------------------------------------
info "Garantindo build-essential e python3 (necessários para compilar dependências nativas)..."
if dpkg -s build-essential >/dev/null 2>&1 && dpkg -s python3 >/dev/null 2>&1; then
  success "build-essential e python3 já instalados."
else
  # Não falha se algum repositório de terceiros (ex: Elastic, Docker, PPAs) der
  # erro de assinatura/rede — isso é comum em instalações de Kali com vários
  # repositórios extras e não impede o apt-get install de funcionar com o
  # cache dos repositórios que sincronizaram com sucesso.
  $SUDO apt-get update -y || warn "Alguns repositórios não puderam ser atualizados (provavelmente repositórios de terceiros alheios a este projeto) — continuando mesmo assim."
  $SUDO apt-get install -y build-essential python3
  success "Dependências de sistema OK."
fi

# ---------------------------------------------------------------------------
# 3) Arquivo .env do backend
# ---------------------------------------------------------------------------
ENV_FILE="$SERVER_DIR/.env"
if [ -f "$ENV_FILE" ]; then
  success "Arquivo .env já existe em server/.env — mantendo o que está lá."
else
  info "Criando server/.env..."
  cp "$SERVER_DIR/.env.example" "$ENV_FILE"

  ADMIN_EMAIL="${ADMIN_EMAIL:-admin@ejjsolucoes.com.br}"
  ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"

  if [ "$NON_INTERACTIVE" = false ]; then
    read -rp "E-mail do usuário administrador [$ADMIN_EMAIL]: " input_email
    ADMIN_EMAIL="${input_email:-$ADMIN_EMAIL}"

    while [ -z "$ADMIN_PASSWORD" ]; do
      read -rsp "Senha do usuário administrador: " ADMIN_PASSWORD
      echo
      if [ -z "$ADMIN_PASSWORD" ]; then
        warn "A senha não pode ficar em branco."
      fi
    done
  fi

  if [ -z "$ADMIN_PASSWORD" ]; then
    ADMIN_PASSWORD="$(openssl rand -hex 8)"
    warn "Nenhuma senha informada; gerei uma senha aleatória: $ADMIN_PASSWORD (anote agora!)"
  fi

  JWT_SECRET="$(openssl rand -hex 32)"
  CRON_SECRET="$(openssl rand -hex 32)"

  # Substitui os valores padrão do .env.example pelos gerados/informados.
  sed -i \
    -e "s#^ADMIN_EMAIL=.*#ADMIN_EMAIL=${ADMIN_EMAIL}#" \
    -e "s#^ADMIN_PASSWORD=.*#ADMIN_PASSWORD=${ADMIN_PASSWORD}#" \
    -e "s#^JWT_SECRET=.*#JWT_SECRET=${JWT_SECRET}#" \
    -e "s#^CRON_SECRET=.*#CRON_SECRET=${CRON_SECRET}#" \
    "$ENV_FILE"

  success "server/.env criado. Login inicial: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}"
  warn "Guarde essa senha — ela só é usada para criar o usuário na primeira execução."
fi

# ---------------------------------------------------------------------------
# 4) Instalar backend
# ---------------------------------------------------------------------------
info "Instalando dependências do backend (server/)..."
npm install --prefix "$SERVER_DIR"
success "Backend pronto."

# ---------------------------------------------------------------------------
# 5) Instalar e buildar frontend
# ---------------------------------------------------------------------------
info "Instalando dependências do frontend (client/)..."
npm install --prefix "$CLIENT_DIR"

info "Gerando build de produção do frontend..."
npm run build --prefix "$CLIENT_DIR"
success "Frontend buildado em client/dist."

# ---------------------------------------------------------------------------
# 6) Deixar rodando (PM2) ou apenas orientar
# ---------------------------------------------------------------------------
if [ "$RUN_PM2" = true ]; then
  if ! command -v pm2 >/dev/null 2>&1; then
    info "Instalando PM2 globalmente..."
    $SUDO npm install -g pm2
  fi

  info "Iniciando o sistema com PM2..."
  (cd "$SERVER_DIR" && pm2 start index.js --name ejj-sistema)
  pm2 save

  success "Sistema rodando em segundo plano via PM2 (processo 'ejj-sistema')."
  echo
  echo "Para o sistema iniciar sozinho quando o Kali ligar, rode o comando que o"
  echo "'pm2 startup' abaixo vai te mostrar (copie e execute):"
  pm2 startup || true
  echo
  echo "Comandos úteis: pm2 status | pm2 logs ejj-sistema | pm2 restart ejj-sistema"
elif [ "$RUN_START" = true ]; then
  PORT="${PORT:-4000}"
  success "Tudo pronto! Iniciando o servidor em http://localhost:${PORT}"
  (cd "$SERVER_DIR" && npm start)
else
  PORT="${PORT:-4000}"
  echo
  success "Instalação concluída."
  echo "Para iniciar o sistema agora, rode:"
  echo "  cd $(realpath --relative-to="$PWD" "$SERVER_DIR" 2>/dev/null || echo "$SERVER_DIR") && npm start"
  echo "Depois acesse: http://localhost:${PORT}"
  echo
  echo "Dica: rode este script com --pm2 para deixá-lo sempre ativo em segundo plano,"
  echo "ou com --start para já iniciar em primeiro plano agora."
fi
