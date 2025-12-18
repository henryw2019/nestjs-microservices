import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { KeyStoreController } from './keystore.controller';
import { KeyStoreService } from './keystore.service';
import { TransferController } from './transfer.controller';
import { TransferService } from './transfer.service';
import { AmlModule } from '../aml/aml.module';
import { OfflineTransactionScheduler } from './offline-transaction.scheduler';

@Module({
    imports: [AmlModule, ScheduleModule.forRoot()],
    controllers: [KeyStoreController, TransferController],
    providers: [KeyStoreService, TransferService, OfflineTransactionScheduler],
    exports: [KeyStoreService, TransferService],
})
export class KeyStoreModule {}
