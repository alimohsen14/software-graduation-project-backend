import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  const configService = app.get(ConfigService);

  // FRONTEND_URLS should be comma-separated
  // مثال:
  // Local: http://localhost:3001,http://192.168.1.15:3001
  // Prod:  https://your-frontend.vercel.app
  const frontendUrls =
    configService
      .get<string>('FRONTEND_URLS')
      ?.split(',')
      .map((url) => url.trim()) || [];

  app.enableCors({
    origin: (origin, callback) => {
      // allow requests with no origin (Postman, server-to-server)
      if (!origin) return callback(null, true);

      if (frontendUrls.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Server is running on port ${port}`);
}

bootstrap();
