import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { CommonModule } from 'src/common/common.module';
import { KeyStoreModule } from '../modules/keystore/keystore.module';
import { ContractModule } from '../modules/contract/contract.module';
import { AppController } from './app.controller';

@Module({
    imports: [
        CommonModule,
        KeyStoreModule,
    ContractModule,
        TerminusModule,
    ],
    controllers: [AppController],
    providers: [],
})
export class AppModule {}
