import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { HealthIndicatorResult } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService extends Redis implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);

    constructor(private readonly configService: ConfigService) {
        super(configService.get<string>('redis.url') || '');
    }

    async onModuleInit(): Promise<void> {
        try {
            await this.ping();
            this.logger.log('Redis connection established');
        } catch (error) {
            this.logger.error('Failed to connect to Redis', error);
            throw error;
        }
    }

    async onModuleDestroy(): Promise<void> {
        try {
            await this.quit();
            this.logger.log('Redis connection closed');
        } catch (error) {
            this.logger.error('Error closing Redis connection', error);
        }
    }

    async isHealthy(): Promise<HealthIndicatorResult> {
        const timeout = 5000; // 5秒超时
        
        try {
            const timeoutId = setTimeout(() => {
                throw new Error('Redis health check timeout');
            }, timeout);
            
            try {
                const result = await this.ping();
                clearTimeout(timeoutId);
                
                if (result === 'PONG') {
                    return {
                        redis: {
                            status: 'up',
                            connection: 'active',
                            responseTime: 'normal',
                        },
                    };
                }
                
                throw new Error('Unexpected Redis response');
            } catch (pingError) {
                clearTimeout(timeoutId);
                throw pingError;
            }
        } catch (error) {
            this.logger.error('Redis health check failed', error);
            return {
                redis: {
                    status: 'down',
                    connection: 'failed',
                    error: (error as Error).message,
                    responseTime: 'timeout',
                },
            };
        }
    }
}