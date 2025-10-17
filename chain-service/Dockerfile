FROM node:lts-alpine
WORKDIR /app
COPY package.json yarn.lock* ./
RUN apk add --no-cache python3 make g++ \
  && yarn --frozen-lockfile --production=false
COPY . .
RUN yarn build
EXPOSE 9100
CMD ["node","dist/main.js"]
