import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { AppController } from './app.controller';
import { ChainModule } from '../modules/chain/chain.module';

@Module({
    imports: [CommonModule, ChainModule],
    controllers: [AppController],
})
export class AppModule {}
