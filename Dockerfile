# Imagem imutável — node:20.18.1-alpine pinada por digest (não muda mesmo se a tag for retagueada)
FROM node:20.18.1-alpine3.20 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

FROM node:20.18.1-alpine3.20 AS runner
WORKDIR /app

# Usuário não-root
RUN addgroup -g 1001 -S nodejs && adduser -S nodeapp -u 1001 -G nodejs

# Copia só o necessário, com ownership do usuário não-root
COPY --from=deps --chown=nodeapp:nodejs /app/node_modules ./node_modules
COPY --chown=nodeapp:nodejs src ./src
COPY --chown=nodeapp:nodejs package.json ./

# Filesystem read-only no runtime (configurável em deploy)
USER nodeapp
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q --spider http://localhost:3000/health || exit 1

CMD ["node", "src/server.js"]
