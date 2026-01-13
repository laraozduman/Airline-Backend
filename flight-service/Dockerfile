FROM node:18-slim

WORKDIR /usr/src/app

COPY . .

RUN npm ci

RUN npm run build

CMD ["node", "dist/index.js"]
