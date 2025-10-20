import { Module } from '@nestjs/common';

import { KeyStoreModule } from '@/modules/keystore/keystore.module';
import { ContractController } from './contract.controller';
import { ContractService } from './contract.service';

@Module({
    imports: [KeyStoreModule],
    controllers: [ContractController],
    providers: [ContractService],
    exports: [ContractService],
})
export class ContractModule {}
