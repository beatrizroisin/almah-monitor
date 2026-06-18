FROM node:20-slim
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
RUN npm install

COPY . .
RUN npx prisma generate
RUN npx tsc -p tsconfig.json --noEmitOnError false 2>&1 || true
RUN test -f dist/main.js && echo "✓ dist/main.js OK" || (echo "✗ FALHOU" && exit 1)

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]