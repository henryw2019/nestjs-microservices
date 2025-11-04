import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { ChainQueryService } from './services/chain-query.service';
import { BlockController } from './controllers/block.controller';
import { TransactionController } from './controllers/transaction.controller';
import { Erc20TransferController } from './controllers/erc20-transfer.controller';
import { EventLogController } from './controllers/event-log.controller';
import { AddressBalanceController } from './controllers/address-balance.controller';
import { TokenMetaController } from './controllers/token-meta.controller';

@Module({
    imports: [CommonModule],
    controllers: [
        BlockController,
        TransactionController,
        Erc20TransferController,
        EventLogController,
        AddressBalanceController,
        TokenMetaController,
    ],
    providers: [ChainQueryService],
    exports: [ChainQueryService],
})
export class ChainModule {}
