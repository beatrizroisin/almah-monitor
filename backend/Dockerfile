FROM node:20-slim
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
RUN npm install

COPY . .
RUN npx prisma generate
RUN npx tsc --project tsconfig.json --noEmitOnError false; exit 0

RUN ls -la dist/ 2>/dev/null && echo "dist existe" || echo "dist NAO existe"

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
