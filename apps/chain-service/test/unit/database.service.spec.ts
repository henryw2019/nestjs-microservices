import { DatabaseService } from '../../src/common/services/database.service';

describe('DatabaseService', () => {
    let service: DatabaseService;
    let connectSpy: jest.SpyInstance;
    let disconnectSpy: jest.SpyInstance;
    let queryRawSpy: jest.SpyInstance;
    let loggerLogSpy: jest.SpyInstance;
    let loggerErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        service = new DatabaseService();
        connectSpy = jest.spyOn(service, '$connect').mockResolvedValue(undefined as any);
        disconnectSpy = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined as any);
        queryRawSpy = jest.spyOn(service, '$queryRaw').mockResolvedValue(1 as any);
        loggerLogSpy = jest.spyOn(service['logger'], 'log').mockImplementation(() => undefined);
        loggerErrorSpy = jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('logs success when onModuleInit connects', async () => {
        await service.onModuleInit();

        expect(connectSpy).toHaveBeenCalled();
        expect(loggerLogSpy).toHaveBeenCalledWith('Database connection established');
    });

    it('logs and rethrows when onModuleInit fails', async () => {
        const error = new Error('fail');
        connectSpy.mockRejectedValueOnce(error);

        await expect(service.onModuleInit()).rejects.toThrow(error);
        expect(loggerErrorSpy).toHaveBeenCalledWith('Failed to connect to database', error);
    });

    it('logs success when onModuleDestroy disconnects', async () => {
        await service.onModuleDestroy();

        expect(disconnectSpy).toHaveBeenCalled();
        expect(loggerLogSpy).toHaveBeenCalledWith('Database connection closed');
    });

    it('logs error when onModuleDestroy fails', async () => {
        const error = new Error('fail');
        disconnectSpy.mockRejectedValueOnce(error);

        await service.onModuleDestroy();

        expect(loggerErrorSpy).toHaveBeenCalledWith('Error closing database connection', error);
    });

    it('reports healthy status when query succeeds', async () => {
        const result = await service.isHealthy();

        expect(queryRawSpy).toHaveBeenCalled();
        expect(result).toEqual({
            database: {
                status: 'up',
                connection: 'active',
            },
        });
    });

    it('reports failure when query throws', async () => {
        const error = new Error('db down');
        queryRawSpy.mockRejectedValueOnce(error);

        const result = await service.isHealthy();

        expect(loggerErrorSpy).toHaveBeenCalledWith('Database health check failed', error);
        expect(result).toEqual({
            database: {
                status: 'down',
                connection: 'failed',
                error: error.message,
            },
        });
    });
});
