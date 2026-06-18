FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --silent

COPY db.js server.js ./
COPY public ./public

EXPOSE 3000

CMD ["node", "server.js"]
