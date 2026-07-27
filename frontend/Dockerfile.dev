FROM node:22-alpine

RUN apk add --no-cache wget

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
