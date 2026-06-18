FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --silent

COPY prisma ./prisma
RUN npm install prisma --no-save --silent \
  && npx prisma generate \
  && npm uninstall prisma --silent

COPY db.js server.js admin.js prisma-client.js seed-data.js ./
COPY public ./public

EXPOSE 3000

CMD ["node", "server.js"]
