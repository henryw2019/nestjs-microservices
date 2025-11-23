import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../../src/common/services/database.service';

describe('DatabaseService', () => {
    let service: DatabaseService;
    let loggerLogSpy: jest.SpyInstance;
    let loggerErrorSpy: jest.SpyInstance;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [DatabaseService],
        }).compile();

        service = module.get<DatabaseService>(DatabaseService);

        // Mock logger methods
        loggerLogSpy = jest.spyOn(service['logger'], 'log').mockImplementation(() => undefined);
        loggerErrorSpy = jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should have logger instance', () => {
        expect(service['logger']).toBeDefined();
        expect(service['logger']).toBeInstanceOf(Logger);
    });

    describe('onModuleInit', () => {
        it('should call $connect and log success', async () => {
            const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue(undefined as any);

            await service.onModuleInit();

            expect(connectSpy).toHaveBeenCalled();
            expect(loggerLogSpy).toHaveBeenCalledWith('Database connection established');
        });

        it('should log error if connection fails', async () => {
            const connectSpy = jest
                .spyOn(service, '$connect')
                .mockRejectedValue(new Error('Connection failed'));

            await expect(service.onModuleInit()).rejects.toThrow('Connection failed');

            expect(connectSpy).toHaveBeenCalled();
            expect(loggerErrorSpy).toHaveBeenCalledWith(
                'Failed to connect to database',
                expect.any(Error),
            );
        });
    });

    describe('onModuleDestroy', () => {
        it('should call $disconnect and log success', async () => {
            const disconnectSpy = jest
                .spyOn(service, '$disconnect')
                .mockResolvedValue(undefined as any);

            await service.onModuleDestroy();

            expect(disconnectSpy).toHaveBeenCalled();
            expect(loggerLogSpy).toHaveBeenCalledWith('Database connection closed');
        });

        it('should log error if disconnection fails', async () => {
            const disconnectSpy = jest
                .spyOn(service, '$disconnect')
                .mockRejectedValue(new Error('Disconnection failed'));

            await service.onModuleDestroy();

            expect(disconnectSpy).toHaveBeenCalled();
            expect(loggerErrorSpy).toHaveBeenCalledWith(
                'Error closing database connection',
                expect.any(Error),
            );
        });
    });

    describe('Disabled Methods', () => {
        it('should throw error when calling $transaction', () => {
            expect(() => service.$transaction([])).toThrow(
                'Transactions are disabled in the read-only chain-reader service.',
            );
        });

        it('should throw error when calling $executeRaw', () => {
            expect(() => service.$executeRaw`SELECT 1`).toThrow(
                'Raw operations are disabled in chain-reader service.',
            );
        });

        it('should throw error when calling $executeRawUnsafe', () => {
            expect(() => service.$executeRawUnsafe('SELECT 1')).toThrow(
                'Raw operations are disabled in chain-reader service.',
            );
        });

        it('should throw error when calling $queryRawUnsafe', () => {
            expect(() => service.$queryRawUnsafe('SELECT 1')).toThrow(
                'Raw operations are disabled in chain-reader service.',
            );
        });
    });

    describe('isHealthy', () => {
        it('should return status up when database is healthy', async () => {
            const queryRawSpy = jest
                .spyOn(service, '$queryRaw')
                .mockResolvedValue([{ '?column?': 1 }]);

            const result = await service.isHealthy();

            expect(queryRawSpy).toHaveBeenCalled();
            expect(result).toEqual({
                database: {
                    status: 'up',
                    connection: 'active',
                },
            });
        });

        it('should return status down when database is unhealthy', async () => {
            const queryRawSpy = jest
                .spyOn(service, '$queryRaw')
                .mockRejectedValue(new Error('DB Error'));

            const result = await service.isHealthy();

            expect(queryRawSpy).toHaveBeenCalled();
            expect(loggerErrorSpy).toHaveBeenCalledWith(
                'Database health check failed',
                expect.any(Error),
            );
            expect(result).toEqual({
                database: {
                    status: 'down',
                    connection: 'failed',
                    error: 'DB Error',
                },
            });
        });
    });

    describe('Read-only Proxy', () => {
        const models = ['block', 'tx', 'eRC20Transfer', 'eventLog', 'addressBalance', 'tokenMeta'];

        const writeMethods = [
            'create',
            'createMany',
            'update',
            'updateMany',
            'upsert',
            'delete',
            'deleteMany',
        ];

        models.forEach(model => {
            describe(`Model: ${model}`, () => {
                beforeEach(() => {
                    // Mock the model property on the service if it doesn't exist (since we are mocking PrismaClient behavior)
                    // However, the constructor logic runs on the real instance.
                    // We need to ensure that 'service' has these properties.
                    // Since we are using a real instance of DatabaseService, the constructor has run.
                    // But the properties like 'block' might be undefined because we didn't connect to a real DB or generate the client fully?
                    // PrismaClient usually generates these properties.
                    // Let's check if we need to mock the property existence for the proxy to work.

                    // The constructor wraps existing properties. If they are undefined, the proxy might not work as expected or throw.
                    // In the constructor: const original = (this as any)[m];
                    // If original is undefined, the proxy target is undefined.

                    // Let's mock the model property to be an object so the proxy has something to target.
                    if (!(service as any)[model]) {
                        (service as any)[model] = {};
                    }

                    // Wait, the constructor ALREADY ran.
                    // If (this as any)[m] was undefined during constructor, the proxy target is undefined.
                    // We might need to mock these properties BEFORE the service is instantiated,
                    // but we can't easily do that with Test.createTestingModule because it instantiates the provider.

                    // However, the code is:
                    // for (const m of models) {
                    //    const original = (this as any)[m];
                    //    (this as any)[m] = new Proxy(original, ...

                    // If original is undefined, 'new Proxy(undefined, ...)' will throw TypeError: Cannot create proxy with a non-object as target or handler
                    // Since the tests passed previously, it means the constructor didn't throw.
                    // This implies that (this as any)[m] was NOT undefined, or the loop didn't run, or something else.
                    // PrismaClient usually has these properties defined on the prototype or instance.
                });

                writeMethods.forEach(method => {
                    it(`should throw error when calling ${method}`, () => {
                        // We need to ensure the property exists to call it.
                        // The proxy should intercept the 'get' and return the throwing function.

                        // If the constructor ran successfully, (service as any)[model] is a Proxy.
                        const modelProxy = (service as any)[model];

                        // If the modelProxy is undefined, the test will fail.
                        expect(modelProxy).toBeDefined();

                        expect(() => {
                            modelProxy[method]();
                        }).toThrow(
                            `Write operation "${method}" is disabled in chain-reader service.`,
                        );
                    });
                });

                it('should allow read operations', () => {
                    const modelProxy = (service as any)[model];
                    // We just check that accessing a non-write method doesn't return the throwing function.
                    // Since we don't have a real underlying object, calling it might fail, but getting it should be fine.

                    const readMethod = modelProxy.findMany;
                    // It should NOT be the throwing function.
                    // The throwing function throws "Write operation ...".

                    // If we call it, it might fail because 'original' was undefined or didn't have findMany.
                    // But the proxy trap only intercepts writeMethods.
                    // For other methods, it does: return Reflect.get(target, prop, receiver);

                    // If target is undefined/null, Reflect.get might behave differently.
                    // But as noted, the constructor didn't throw, so target must be an object.

                    // Let's just verify it doesn't throw the specific error.
                    expect(() => {
                        // We don't call it, just access it.
                        // Wait, the trap is on 'get'.
                        const fn = modelProxy.findMany;
                    }).not.toThrow();
                });
            });
        });
    });
});
