import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@almah.com.br';
  const password = process.env.SEED_ADMIN_PASSWORD || 'TrocarSenha123!';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Usuário ${email} já existe — pulando seed.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name: 'Administrador Almah',
      email,
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log(`Usuário admin criado: ${email} / senha: ${password}`);
  console.log('IMPORTANTE: troque essa senha no primeiro login.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
