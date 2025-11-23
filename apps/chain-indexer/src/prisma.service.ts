import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@repo/database/indexer';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
    private prisma: PrismaClient;

    constructor() {
        // 优先使用服务专用的数据库URL，然后回退到通用DATABASE_URL
        // 这符合新的环境变量配置规范
        const pool = new Pool({ 
            connectionString: process.env.INDEXER_DATABASE_URL || process.env.DATABASE_URL 
        });
        const adapter = new PrismaPg(pool);
        this.prisma = new PrismaClient({ adapter });
    }

    get client(): PrismaClient {
        return this.prisma;
    }

    async onModuleInit() {
        await this.prisma.$connect();
    }

    async onModuleDestroy() {
        await this.prisma.$disconnect();
    }
}
