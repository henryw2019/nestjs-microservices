import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@repo/database/indexer';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
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
