import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

// AES-256-GCM — usado para criptografar AppToken VTEX e tokens OAuth
// Google antes de persistir em integrations.credentials_encrypted.
// Nunca armazenar credenciais em texto puro (ver doc 02, convenções).

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(private config: ConfigService) {
    const secret = this.config.get<string>('CRYPTO_SECRET');
    if (!secret || secret.length < 32) {
      throw new Error('CRYPTO_SECRET deve ter ao menos 32 caracteres. Gere com: openssl rand -hex 32');
    }
    // Deriva uma chave de 32 bytes a partir do secret configurado.
    this.key = crypto.createHash('sha256').update(secret).digest();
  }

  encrypt(plainObject: unknown): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
    const plaintext = JSON.stringify(plainObject);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Formato armazenado: iv:authTag:ciphertext (tudo em base64)
    return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':');
  }

  decrypt<T = any>(payload: string): T {
    const [ivB64, tagB64, dataB64] = payload.split(':');
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');
    const encrypted = Buffer.from(dataB64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  }
}
