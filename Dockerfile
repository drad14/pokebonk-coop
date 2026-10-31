FROM node:24-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8777 PBCOOP_DATA_DIR=/app/data PBCOOP_CACHE_DIR=/app/cache
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
COPY --chown=node:node server.js api.js native-coop.js native-relay.js patches.js build-manager.js profile-store.js tunnel.js runtime-config.js gacha.js loot.js catalog.json private.html ./
COPY --chown=node:node client ./client
RUN mkdir -p /app/data /app/cache && chown node:node /app/data /app/cache
USER node
EXPOSE 8777
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 CMD node -e "fetch('http://127.0.0.1:8777/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
