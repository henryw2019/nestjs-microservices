import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { CommonModule } from 'src/common/common.module';
import { KeyStoreModule } from '../modules/keystore/keystore.module';
import { ContractModule } from '../modules/contract/contract.module';
import { StablecoinModule } from '../modules/stablecoin/stablecoin.module';
import { AppController } from './app.controller';

@Module({
    imports: [CommonModule, KeyStoreModule, ContractModule, StablecoinModule, TerminusModule],
    controllers: [AppController],
    providers: [],
})
export class AppModule {}
