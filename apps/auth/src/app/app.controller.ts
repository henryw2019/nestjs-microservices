import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    HealthCheck,
    HealthCheckService,
    MemoryHealthIndicator,
    DiskHealthIndicator,
} from '@nestjs/terminus';
import { PublicRoute } from 'src/common/decorators/public.decorator';

import { DatabaseService } from 'src/common/services/database.service';
import { RedisService } from 'src/common/services/redis.service';
import { HealthCacheService } from 'src/common/services/health-cache.service';

@ApiTags('app')
@Controller({
    version: VERSION_NEUTRAL,
    path: '/',
})
export class AppController {
    constructor(
        private readonly healthCheckService: HealthCheckService,
        private readonly databaseService: DatabaseService,
        private readonly redisService: RedisService,
        private readonly memoryHealthIndicator: MemoryHealthIndicator,
        private readonly diskHealthIndicator: DiskHealthIndicator,
        private readonly healthCacheService: HealthCacheService,
    ) {}

    @Get('/health')
    @HealthCheck()
    @PublicRoute()
    public async getHealth() {
        return this.healthCheckService.check([
            () =>
                this.healthCacheService.withCache(
                    'database',
                    () => this.databaseService.isHealthy(),
                    5000,
                ),
            () =>
                this.healthCacheService.withCache(
                    'redis',
                    () => this.redisService.isHealthy(),
                    5000,
                ),
            () => this.memoryHealthIndicator.checkHeap('memory_heap', 150 * 1024 * 1024), // 150MB
            () =>
                this.diskHealthIndicator.checkStorage('disk', { path: '/', thresholdPercent: 0.9 }),
        ]);
    }
}
