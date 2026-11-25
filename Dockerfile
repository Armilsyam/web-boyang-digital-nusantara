FROM node:26-slim AS base
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/app/data/boyang-digital.db
ENV UPLOADS_DIR=/app/data/uploads

RUN mkdir -p /app/data/uploads
VOLUME ["/app/data"]

EXPOSE 3000
CMD ["npm", "start"]
