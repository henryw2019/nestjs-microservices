import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@repo/database/indexer';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);
    private prisma: PrismaClient;

    constructor() {
        const pool = new Pool({
            connectionString: process.env.INDEXER_DATABASE_URL,
        });
        const adapter = new PrismaPg(pool);
        this.prisma = new PrismaClient({ adapter });
    }

    get client(): PrismaClient {
        return this.prisma;
    }

    async onModuleInit() {
        await this.prisma.$connect();
        const dbUrl = process.env.INDEXER_DATABASE_URL || '';
        const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
        this.logger.log(`Database connection established to ${maskedUrl}`);
    }

    async onModuleDestroy() {
        await this.prisma.$disconnect();
    }
}
