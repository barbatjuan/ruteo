import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { join } from 'path';
// Ensure .env is loaded regardless of CWD
dotenv.config({ path: join(__dirname, '..', '.env') });
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ logger: true }));
  app.enableCors({
    origin: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(','),
    credentials: true,
  });
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
  await app.listen({ port, host: '0.0.0.0' });
}
bootstrap().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
