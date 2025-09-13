import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { GraphQLExceptionFilter } from './common/filters/graphql-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filters
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalFilters(new GraphQLExceptionFilter());

  // Global prefix for REST endpoints
  app.setGlobalPrefix('api');

  const port = configService.get('PORT') || 4323;
  await app.listen(port);

  console.log(`🚀 Recipe Sharing Platform is running on: http://localhost:${port}/graphql`);
  console.log(`🔍 GraphQL Playground: http://localhost:${port}/graphql`);
  console.log(`📊 Health Check: http://localhost:${port}/api/health`);
}

bootstrap();
