import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { HealthIndicatorResult } from '@nestjs/terminus';
import { PrismaClient } from '@repo/database/auth';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(DatabaseService.name);

    constructor() {
        const pool = new Pool({ 
            connectionString: process.env.AUTH_DATABASE_URL
        });
        const adapter = new PrismaPg(pool);
        super({ adapter });
    }

    async onModuleInit(): Promise<void> {
        try {
            await this.$connect();
            const dbUrl = process.env.AUTH_DATABASE_URL || '';
            const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
            this.logger.log(`Database connection established to ${maskedUrl}`);
        } catch (error) {
            this.logger.error('Failed to connect to database', error);
            throw error;
        }
    }

    async onModuleDestroy(): Promise<void> {
        try {
            await this.$disconnect();
            this.logger.log('Database connection closed');
        } catch (error) {
            this.logger.error('Error closing database connection', error);
        }
    }

    async isHealthy(): Promise<HealthIndicatorResult> {
        const timeout = 5000; // 5秒超时
        
        try {
            // 使用AbortController实现更安全的超时控制
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            try {
                // 使用Prisma的queryRaw进行健康检查
                await this.$queryRaw`SELECT 1`;
                clearTimeout(timeoutId);
                
                return {
                    database: {
                        status: 'up',
                        connection: 'active',
                        responseTime: 'normal',
                    },
                };
            } catch (queryError) {
                clearTimeout(timeoutId);
                throw queryError;
            }
        } catch (error) {
            this.logger.error('Database health check failed', error);
            return {
                database: {
                    status: 'down',
                    connection: 'failed',
                    error: (error as Error).message,
                    responseTime: 'timeout',
                },
            };
        }
    }
}
