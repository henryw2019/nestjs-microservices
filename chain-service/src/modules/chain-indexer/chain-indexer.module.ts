import { Module } from '@nestjs/common';

import { ChainServiceController } from './controllers/chain-indexer.controller';
import { ChainIndexerService } from './services/chain-indexer.service';

@Module({
    controllers: [ChainServiceController],
    providers: [ChainIndexerService],
})
export class ChainIndexerModule {}
