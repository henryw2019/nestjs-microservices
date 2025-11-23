import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IndexerService } from './indexer/indexer.service';
import { PrismaService } from './prisma.service';
import Joi from 'joi';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            cache: true,
            envFilePath: ['../../.env.docker', '.env.docker', '.env'],
            expandVariables: true,
            validationSchema: Joi.object({
                NODE_ENV: Joi.string()
                    .valid('development', 'staging', 'production', 'local')
                    .default('development'),
                
                // Database Configuration
                DATABASE_URL: Joi.string().uri().optional(),
                INDEXER_DATABASE_URL: Joi.string().uri().required(),
                
                // Blockchain Configuration
                ETH_RPC_URL: Joi.string().uri().required(),
                CHAIN_ID: Joi.number().required(),
                POLL_INTERVAL_MS: Joi.number().default(5000),
                BATCH_SIZE: Joi.number().default(5),
                TRANSACTION_TIMEOUT_MS: Joi.number().default(600000),
                CONFIRMATIONS: Joi.number().default(12),
                GENESIS_JSON_PATH: Joi.string().default('./genesis.json'),
            }),
        }),
    ],
    providers: [IndexerService, PrismaService],
})
export class AppModule {}
