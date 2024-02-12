# syntax=docker/dockerfile:1

FROM node:20-bookworm
WORKDIR /app
COPY . .
RUN yarn install --production
RUN npx -y playwright@1.41.1 install --with-deps
CMD ["node", "index.js"]
EXPOSE 3000