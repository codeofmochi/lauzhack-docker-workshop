FROM node:lts-alpine

WORKDIR /app

COPY . /app

RUN npm install

EXPOSE 3000

USER node

CMD ["node", "app.js"]