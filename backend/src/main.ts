import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
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

  app.enableCors({
    origin: true,
    credentials: false,
  });

  // Swagger UI is enabled in development by default.
  // To force-enable it in production, set the env var SWAGGER_ENABLED=true.
  // In production (NODE_ENV=production) without that flag, /api/docs returns 404.
  const swaggerEnabled =
    process.env.NODE_ENV !== 'production' ||
    process.env.SWAGGER_ENABLED === 'true';

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Intelligent Investor API')
      .setDescription(
        'Backend API for the Intelligent Investor Platform — manages financial profiles and runs stateless spending-bucket calculations.',
      )
      .setVersion('1.0')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = parseInt(process.env.BACKEND_PORT ?? '8000', 10);
  const host = process.env.BACKEND_HOST ?? '127.0.0.1';
  await app.listen(port, host);
  new Logger('Bootstrap').log(`Backend listening on ${host}:${port}`);
  if (swaggerEnabled) {
    new Logger('Bootstrap').log(`Swagger UI available at http://${host}:${port}/api/docs`);
  }
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start backend:', err);
  process.exit(1);
});
