import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

async function bootstrap() {
  dotenv.config();
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT || 9200);
  console.log('Chain Indexer listening on', process.env.PORT || 9200);
}

bootstrap();
