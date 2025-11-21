import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { HealthCacheService } from 'src/common/services/health-cache.service';
import { Cache } from 'cache-manager';

describe('HealthCacheService', () => {
    let service: HealthCacheService;
    let cacheManager: Cache;
    let configService: ConfigService;

    const mockCacheManager = {
        set: jest.fn(),
        get: jest.fn(),
        del: jest.fn(),
    };

    const mockConfigService = {
        get: jest.fn((key: string, defaultValue: string) => defaultValue),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HealthCacheService,
                {
                    provide: CACHE_MANAGER,
                    useValue: mockCacheManager,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        service = module.get<HealthCacheService>(HealthCacheService);
        cacheManager = module.get<Cache>(CACHE_MANAGER);
        configService = module.get<ConfigService>(ConfigService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('set', () => {
        it('should set cache with correct key and ttl', async () => {
            const key = 'test';
            const result = { status: 'up' } as any;
            const ttl = 1000;

            await service.set(key, result, ttl);

            expect(cacheManager.set).toHaveBeenCalledWith(
                'auth:health:test',
                expect.objectContaining({
                    result,
                    timestamp: expect.any(Number),
                }),
                ttl,
            );
        });
    });

    describe('get', () => {
        it('should return cached result if exists', async () => {
            const key = 'test';
            const result = { status: 'up' } as any;
            mockCacheManager.get.mockResolvedValue({ result, timestamp: Date.now() });

            const cached = await service.get(key);

            expect(cached).toEqual(result);
            expect(cacheManager.get).toHaveBeenCalledWith('auth:health:test');
        });

        it('should return null if cache miss', async () => {
            const key = 'test';
            mockCacheManager.get.mockResolvedValue(null);

            const cached = await service.get(key);

            expect(cached).toBeNull();
        });
    });

    describe('clear', () => {
        it('should clear specific key', async () => {
            const key = 'test';
            await service.clear(key);
            expect(cacheManager.del).toHaveBeenCalledWith('auth:health:test');
        });

        it('should clear all known health keys', async () => {
            await service.clear();
            expect(cacheManager.del).toHaveBeenCalledWith('auth:health:database');
            expect(cacheManager.del).toHaveBeenCalledWith('auth:health:redis');
        });
    });

    describe('withCache', () => {
        it('should return cached value if available', async () => {
            const key = 'test';
            const result = { status: 'up' } as any;
            mockCacheManager.get.mockResolvedValue({ result, timestamp: Date.now() });
            const fn = jest.fn();

            const value = await service.withCache(key, fn);

            expect(value).toEqual(result);
            expect(fn).not.toHaveBeenCalled();
        });

        it('should execute function and cache result if cache miss', async () => {
            const key = 'test';
            const result = { status: 'up' } as any;
            mockCacheManager.get.mockResolvedValue(null);
            const fn = jest.fn().mockResolvedValue(result);

            const value = await service.withCache(key, fn);

            expect(value).toEqual(result);
            expect(fn).toHaveBeenCalled();
            expect(cacheManager.set).toHaveBeenCalled();
        });

        it('should clear cache and throw error if function fails', async () => {
            const key = 'test';
            const error = new Error('Fail');
            mockCacheManager.get.mockResolvedValue(null);
            const fn = jest.fn().mockRejectedValue(error);

            await expect(service.withCache(key, fn)).rejects.toThrow(error);
            expect(cacheManager.del).toHaveBeenCalledWith('auth:health:test');
        });
    });

    describe('getStats', () => {
        it('should return stats for existing keys', async () => {
            mockCacheManager.get.mockImplementation((key) => {
                if (key === 'auth:health:database') return Promise.resolve({});
                return Promise.resolve(null);
            });

            const stats = await service.getStats();

            expect(stats).toEqual({
                totalKeys: 1,
                keys: ['auth:health:database'],
            });
        });
    });
});
