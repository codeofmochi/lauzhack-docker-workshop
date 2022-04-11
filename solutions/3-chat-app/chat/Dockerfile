FROM node:lts-alpine

WORKDIR /app

COPY . /app

RUN npm install

EXPOSE 3002

USER node

CMD ["node", "app.js"]