FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY src ./src
RUN npx prisma generate

FROM node:20-alpine
ENV NODE_ENV=production
RUN apk add --no-cache curl
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src ./src
COPY package*.json ./
RUN mkdir -p /app/storage && chown -R node:node /app/storage
USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=5 \
  CMD curl -fsS http://localhost:5000/healthz || exit 1
CMD ["node", "src/index.js"]
