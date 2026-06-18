# ALMAH Monitor

Sistema interno da Almah para monitorar diariamente a saúde dos produtos
enviados da VTEX para o Google Merchant Center, identificando perda de
indexação, reprovações e quedas de SKUs elegíveis para Shopping Ads antes
que isso se torne perda de venda.

Este repositório contém dois projetos independentes:

- **`frontend/`** — React + SCSS (desktop e mobile), pronto para apontar
  para uma API real via `VITE_API_URL`.
- **`backend/`** — NestJS + Prisma + PostgreSQL + Redis/BullMQ, com os
  módulos de auth, clients, integrations, sync, alerts, health, reports e
  notifications.

Veja `GUIA_SETUP_E_DEPLOY.md` na raiz para o passo a passo completo de
contas, chaves de API e deploy.

## Rodando localmente

### Backend

```bash
cd backend
cp .env.example .env   # preencha DATABASE_URL, JWT_SECRET, CRYPTO_SECRET, etc.
npm install
npx prisma migrate dev
npm run seed            # cria o usuário admin inicial
npm run start:dev
```

### Frontend

```bash
cd frontend
cp .env.example .env   # VITE_API_URL=http://localhost:3000
npm install
npm run dev
```

Acesse `http://localhost:5173`, faça login com o usuário criado pelo seed.
