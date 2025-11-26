import { Module } from '@nestjs/common';
import { StablecoinService } from './stablecoin.service';
import { StablecoinController } from './stablecoin.controller';
import { KeyStoreModule } from '../keystore/keystore.module';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [KeyStoreModule, ConfigModule],
    controllers: [StablecoinController],
    providers: [StablecoinService],
})
export class StablecoinModule {}
