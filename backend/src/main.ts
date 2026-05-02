import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Allow the frontend (running on a different origin in dev) to call the API.
  app.enableCors({
    origin: true,
    credentials: false,
  });

  const port = parseInt(process.env.BACKEND_PORT ?? '8000', 10);
  // Host selection:
  //  - In Docker/CI/prod we MUST bind to 0.0.0.0 so the container is reachable
  //    from outside its own network namespace (nginx, the host port mapping,
  //    healthchecks, etc). Set BACKEND_HOST=0.0.0.0 in those environments.
  //  - On Replit (local dev workflow) we default to 127.0.0.1 — the Vite dev
  //    proxy and the workflow probe both hit IPv4 loopback, and we don't want
  //    to expose the API on the public iframe port.
  const host = process.env.BACKEND_HOST ?? '127.0.0.1';
  await app.listen(port, host);
  new Logger('Bootstrap').log(`Backend listening on ${host}:${port}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start backend:', err);
  process.exit(1);
});
