import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';
import { PrismaService } from './prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Controller('seed')
export class SeedController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get('run-once-admin')
  async runSeed() {
    const email = 'admin@almah.com.br';
    const password = 'TrocarSenha123!';

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { message: 'Usuário admin já existe.', email };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await this.prisma.user.create({
      data: {
        name: 'Administrador Almah',
        email,
        passwordHash,
        role: 'ADMIN',
      },
    });

    return { message: 'Usuário admin criado com sucesso!', email, password };
  }
}