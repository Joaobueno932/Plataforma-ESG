# API da Plataforma ESG-FIEMS.
#
# Imagem única (sem build de código: a API é CommonJS puro), rodando como usuário sem
# privilégios. As migrações são aplicadas na subida pela própria API (RUN_MIGRATIONS=true).
#
# Nenhum pacote extra é instalado: `mysqldump`/`mysql` são executados no container do banco
# (ver scripts/backup.js) e o encaminhamento de sinais vem do `init: true` do compose.
FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production

# Dependências primeiro: a camada só é refeita quando o package-lock muda.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY scripts ./scripts
COPY static ./static

# Diretórios de trabalho (uploads, backups, storage) pertencem ao usuário da aplicação.
RUN mkdir -p /app/storage/uploads /app/storage/backups && chown -R node:node /app/storage /app/static

USER node
EXPOSE 3333

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3333) + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "--no-warnings", "src/server.js"]
