# syntax=docker/dockerfile:1

FROM node:20-alpine
WORKDIR /app
COPY . .
RUN yarn install --production
RUN npx -y playwright install --with-deps
CMD ["node", "index.js"]
EXPOSE 3000