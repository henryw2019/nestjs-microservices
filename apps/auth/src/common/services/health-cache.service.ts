import { Injectable, Logger, Inject } from '@nestjs/common';
import { HealthIndicatorResult } from '@nestjs/terminus';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HealthCacheService {
    private readonly logger = new Logger(HealthCacheService.name);
    private readonly keyPrefix: string;
    private readonly defaultTTL = 5000; // 5秒缓存

    constructor(
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
        private readonly configService: ConfigService,
    ) {
        this.keyPrefix = this.configService.get<string>('redis.keyPrefix', 'auth:') + 'health:';
        this.logger.log(`Health cache service initialized with prefix: ${this.keyPrefix}`);
    }

    private getCacheKey(key: string): string {
        return `${this.keyPrefix}${key}`;
    }

    async set(key: string, result: HealthIndicatorResult, ttl: number = this.defaultTTL): Promise<void> {
        const cacheKey = this.getCacheKey(key);
        await this.cacheManager.set(cacheKey, {
            result,
            timestamp: Date.now(),
        }, ttl);
        this.logger.debug(`Health check cached for ${cacheKey}, TTL: ${ttl}ms`);
    }

    async get(key: string): Promise<HealthIndicatorResult | null> {
        const cacheKey = this.getCacheKey(key);
        const cached = await this.cacheManager.get<{ result: HealthIndicatorResult; timestamp: number }>(cacheKey);
        
        if (!cached) {
            return null;
        }

        this.logger.debug(`Health check served from cache for ${cacheKey}`);
        return cached.result;
    }

    async clear(key?: string): Promise<void> {
        if (key) {
            const cacheKey = this.getCacheKey(key);
            await this.cacheManager.del(cacheKey);
            this.logger.debug(`Health check cache cleared for ${cacheKey}`);
        } else {
            // 清除所有健康检查相关的缓存
            // 由于keys()方法可能在某些存储中不可用，我们采用更安全的方式
            // 只清除已知的健康检查缓存键
            const knownHealthKeys = ['database', 'redis'];
            for (const healthKey of knownHealthKeys) {
                const cacheKey = this.getCacheKey(healthKey);
                await this.cacheManager.del(cacheKey);
            }
            this.logger.debug(`All known health check caches cleared for prefix: ${this.keyPrefix}`);
        }
    }

    async withCache<T extends HealthIndicatorResult>(
        key: string,
        healthCheckFn: () => Promise<T>,
        ttl: number = this.defaultTTL,
    ): Promise<T> {
        const cached = await this.get(key);
        if (cached) {
            return cached as T;
        }

        try {
            const result = await healthCheckFn();
            await this.set(key, result, ttl);
            return result;
        } catch (error) {
            // 健康检查失败时不缓存，确保下次请求重新检查
            await this.clear(key);
            throw error;
        }
    }

    // 获取缓存统计信息
    async getStats(): Promise<{ totalKeys: number; keys: string[] }> {
        // 由于keys()方法可能在某些存储中不可用，我们返回已知的健康检查键
        const knownHealthKeys = ['database', 'redis'];
        const healthKeys = knownHealthKeys.map(key => this.getCacheKey(key));
        
        // 检查这些键是否存在
        const existingKeys: string[] = [];
        for (const key of healthKeys) {
            const value = await this.cacheManager.get(key);
            if (value !== undefined && value !== null) {
                existingKeys.push(key);
            }
        }
        
        return {
            totalKeys: existingKeys.length,
            keys: existingKeys,
        };
    }
}