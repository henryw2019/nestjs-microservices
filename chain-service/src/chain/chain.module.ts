
import { Module } from '@nestjs/common';
import { ChainController } from './chain.controller';
import { ChainService } from './chain.service';
import { KeyStoreService } from './keystore.service';

@Module({
  controllers: [ChainController],
  providers: [ChainService, KeyStoreService],
})
export class ChainModule {}
