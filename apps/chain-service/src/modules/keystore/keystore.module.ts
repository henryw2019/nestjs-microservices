import { Module } from '@nestjs/common';
import { KeyStoreController } from './keystore.controller';
import { KeyStoreService } from './keystore.service';
import { TransferController } from './transfer.controller';
import { TransferService } from './transfer.service';
import { AmlModule } from '../aml/aml.module';

@Module({
    imports: [AmlModule],
    controllers: [KeyStoreController, TransferController],
    providers: [KeyStoreService, TransferService],
    exports: [KeyStoreService, TransferService],
})
export class KeyStoreModule {}
