FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY migrations ./migrations
COPY public ./public
COPY src ./src
USER node
EXPOSE 3090 3091
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:3090/healthz || exit 1
CMD ["node", "src/server.js"]
