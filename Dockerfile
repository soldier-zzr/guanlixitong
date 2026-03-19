FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3021
ENV HOSTNAME=0.0.0.0

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3021

RUN chmod +x scripts/docker-entrypoint.sh

CMD ["sh", "scripts/docker-entrypoint.sh"]
