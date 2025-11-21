import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from 'src/common/services/redis.service';

// Mock ioredis
jest.mock('ioredis', () => {
    return class Redis {
        ping = jest.fn();
        quit = jest.fn();
        constructor() {}
    };
});

describe('RedisService', () => {
    let service: RedisService;
    let configService: ConfigService;

    const mockConfigService = {
        get: jest.fn().mockReturnValue('redis://localhost:6379'),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RedisService,
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        service = module.get<RedisService>(RedisService);
        configService = module.get<ConfigService>(ConfigService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('onModuleInit', () => {
        it('should connect to redis successfully', async () => {
            (service.ping as jest.Mock).mockResolvedValue('PONG');
            const logSpy = jest.spyOn(service['logger'], 'log').mockImplementation();

            await service.onModuleInit();

            expect(service.ping).toHaveBeenCalled();
            expect(logSpy).toHaveBeenCalledWith('Redis connection established');
        });

        it('should throw error when connection fails', async () => {
            const error = new Error('Connection failed');
            (service.ping as jest.Mock).mockRejectedValue(error);
            const errorSpy = jest.spyOn(service['logger'], 'error').mockImplementation();

            await expect(service.onModuleInit()).rejects.toThrow(error);
            expect(errorSpy).toHaveBeenCalledWith('Failed to connect to Redis', error);
        });
    });

    describe('onModuleDestroy', () => {
        it('should close connection successfully', async () => {
            (service.quit as jest.Mock).mockResolvedValue('OK');
            const logSpy = jest.spyOn(service['logger'], 'log').mockImplementation();

            await service.onModuleDestroy();

            expect(service.quit).toHaveBeenCalled();
            expect(logSpy).toHaveBeenCalledWith('Redis connection closed');
        });

        it('should log error when closing connection fails', async () => {
            const error = new Error('Close failed');
            (service.quit as jest.Mock).mockRejectedValue(error);
            const errorSpy = jest.spyOn(service['logger'], 'error').mockImplementation();

            await service.onModuleDestroy();

            expect(errorSpy).toHaveBeenCalledWith('Error closing Redis connection', error);
        });
    });

    describe('isHealthy', () => {
        it('should return healthy status when ping succeeds', async () => {
            (service.ping as jest.Mock).mockResolvedValue('PONG');

            const result = await service.isHealthy();

            expect(result).toEqual({
                redis: {
                    status: 'up',
                    connection: 'active',
                    responseTime: 'normal',
                },
            });
        });

        it('should return unhealthy status when ping returns unexpected value', async () => {
            (service.ping as jest.Mock).mockResolvedValue('WRONG');
            const errorSpy = jest.spyOn(service['logger'], 'error').mockImplementation();

            const result = await service.isHealthy();

            expect(result.redis.status).toBe('down');
            expect(result.redis.error).toBe('Unexpected Redis response');
            expect(errorSpy).toHaveBeenCalled();
        });

        it('should return unhealthy status when ping fails', async () => {
            const error = new Error('Ping failed');
            (service.ping as jest.Mock).mockRejectedValue(error);
            const errorSpy = jest.spyOn(service['logger'], 'error').mockImplementation();

            const result = await service.isHealthy();

            expect(result.redis.status).toBe('down');
            expect(result.redis.error).toBe('Ping failed');
            expect(errorSpy).toHaveBeenCalled();
        });
    });
});
