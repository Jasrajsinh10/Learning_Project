import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadModel } from './embed/embedding';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Pre-load the embedding model
  loadModel().catch(err => {
    console.error('Failed to load embedding model:', err);
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
