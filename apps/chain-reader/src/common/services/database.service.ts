import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicatorResult } from '@nestjs/terminus';
import { Prisma, PrismaClient } from '../../../prisma-client/client';

@Injectable()
export class DatabaseService extends PrismaClient {
    private readonly logger = new Logger(DatabaseService.name);

    constructor() {
        super();

        const models = [
            'block',
            'tx',
            'eRC20Transfer',
            'eventLog',
            'addressBalance',
            'tokenMeta',
        ] as const;
        const writeMethods = new Set([
            'create',
            'createMany',
            'update',
            'updateMany',
            'upsert',
            'delete',
            'deleteMany',
        ]);

        for (const m of models) {
            const original = (this as any)[m];
            (this as any)[m] = new Proxy(original, {
                get(target, prop, receiver) {
                    if (typeof prop === 'string' && writeMethods.has(prop)) {
                        return () => {
                            throw new Error(
                                `Write operation "${prop}" is disabled in chain-reader service.`,
                            );
                        };
                    }
                    return Reflect.get(target, prop, receiver);
                },
            });
        }
    }

    override $transaction(..._args: any[]): never {
        throw new Error('Transactions are disabled in the read-only chain-reader service.');
    }

    override $executeRaw(..._args: any[]): never {
        throw new Error('Raw operations are disabled in chain-reader service.');
    }

    override $executeRawUnsafe(..._args: any[]): never {
        throw new Error('Raw operations are disabled in chain-reader service.');
    }

    override $queryRawUnsafe(..._args: any[]): never {
        throw new Error('Raw operations are disabled in chain-reader service.');
    }

    async onModuleInit(): Promise<void> {
        try {
            await this.$connect();
            this.logger.log('Database connection established');
        } catch (error) {
            this.logger.error('Failed to connect to database', error as Error);
            throw error;
        }
    }

    async onModuleDestroy(): Promise<void> {
        try {
            await this.$disconnect();
            this.logger.log('Database connection closed');
        } catch (error) {
            this.logger.error('Error closing database connection', error as Error);
        }
    }

    async isHealthy(): Promise<HealthIndicatorResult> {
        try {
            await this.$queryRaw`SELECT 1`;
            return {
                database: {
                    status: 'up',
                    connection: 'active',
                },
            };
        } catch (error) {
            this.logger.error('Database health check failed', error as Error);
            return {
                database: {
                    status: 'down',
                    connection: 'failed',
                    error: error instanceof Error ? error.message : String(error),
                },
            };
        }
    }
}
