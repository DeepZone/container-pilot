FROM node:24-alpine

ARG VERSION=development
ARG VCS_REF=unknown
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.title="Container Pilot" \
      org.opencontainers.image.description="Controlled Docker updates with health validation and rollback" \
      org.opencontainers.image.vendor="NoiSens Media" \
      org.opencontainers.image.source="https://github.com/DeepZone/container-pilot" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.licenses="MIT"

WORKDIR /app
COPY package.json ./
COPY src ./src
ENV NODE_ENV=production
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD if [ -n "$CP_TLS_CERT_FILE" ]; then wget --no-check-certificate -q -O /dev/null "https://127.0.0.1:${CP_PORT:-8080}/api/version"; else wget -q -O /dev/null "http://127.0.0.1:${CP_PORT:-8080}/api/version"; fi || exit 1
CMD ["node", "src/server.js"]
