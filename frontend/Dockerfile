# Interface da Plataforma ESG-FIEMS (Next.js 14, App Router).
#
# Build em dois estágios: o primeiro compila, o segundo carrega apenas a saída `standalone`.
# A URL da API é lida em tempo de build (NEXT_PUBLIC_*) e também no ambiente de execução.
FROM node:24-alpine AS build

WORKDIR /app
ARG NEXT_PUBLIC_API_URL=http://localhost:3333
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:24-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000)).then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
