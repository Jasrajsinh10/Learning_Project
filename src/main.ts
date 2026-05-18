import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadModel } from './embed/embedding';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Serve static frontend assets
  app.useStaticAssets(join(process.cwd(), 'public'));

  // Pre-load the embedding model
  loadModel().catch(err => {
    console.error('Failed to load embedding model:', err);
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
