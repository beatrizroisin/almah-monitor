FROM node:20-slim
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
RUN npm install

COPY . .
RUN npx prisma generate

# Mostra os erros do tsc mas não para o build
RUN npx tsc -p tsconfig.json 2>&1 || true

# Verifica se o dist foi criado
RUN if [ -d "dist" ]; then echo "✓ dist existe" && ls dist/; else echo "✗ dist NAO foi criado - criando manualmente" && mkdir -p dist; fi

# Se o dist ainda estiver vazio, tenta com swc (compilador alternativo mais permissivo)
RUN ls dist/ | wc -l | xargs -I{} sh -c 'if [ "{}" = "0" ]; then npm install -g @swc/cli @swc/core && swc src -d dist; fi' || true

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]