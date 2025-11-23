import { Test, TestingModule } from '@nestjs/testing';
import { QueryBuilderService } from '../../src/common/services/query-builder.service';
import { DatabaseService } from '../../src/common/services/database.service';

describe('QueryBuilderService', () => {
    let service: QueryBuilderService;
    let mockDatabaseService: jest.Mocked<DatabaseService>;

    beforeEach(async () => {
        mockDatabaseService = {
            block: {},
            tx: {},
            eRC20Transfer: {},
            eventLog: {},
            addressBalance: {},
            tokenMeta: {},
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                QueryBuilderService,
                {
                    provide: DatabaseService,
                    useValue: mockDatabaseService,
                },
            ],
        }).compile();

        service = module.get<QueryBuilderService>(QueryBuilderService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findManyWithPagination', () => {
        it('should return paginated results', async () => {
            const mockItems = [{ id: 1, name: 'test1' }, { id: 2, name: 'test2' }];
            const mockTotal = 2;
            
            mockDatabaseService.block = {
                findMany: jest.fn().mockResolvedValue(mockItems),
                count: jest.fn().mockResolvedValue(mockTotal),
            };

            const options = {
                model: 'block',
                dto: { page: 1, limit: 10 },
            };

            const result = await service.findManyWithPagination(options);

            expect(result).toEqual({
                items: mockItems,
                meta: {
                    page: 1,
                    limit: 10,
                    total: 2,
                    totalPages: 1,
                    hasNextPage: false,
                    hasPreviousPage: false,
                },
            });
        });

        it('should handle search functionality', async () => {
            const mockItems = [{ id: 1, name: 'search result' }];
            const mockTotal = 1;
            
            mockDatabaseService.tx = {
                findMany: jest.fn().mockResolvedValue(mockItems),
                count: jest.fn().mockResolvedValue(mockTotal),
            };

            const options = {
                model: 'tx',
                dto: { page: 1, limit: 10, search: 'test' },
                searchFields: ['hash', 'from'],
            };

            const result = await service.findManyWithPagination(options);

            expect(mockDatabaseService.tx.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        OR: [
                            { hash: { contains: 'test', mode: 'insensitive' } },
                            { from: { contains: 'test', mode: 'insensitive' } },
                        ],
                    }),
                })
            );
        });

        it('should handle custom filters', async () => {
            const mockItems = [{ id: 1, status: 'confirmed' }];
            const mockTotal = 1;
            
            mockDatabaseService.eventLog = {
                findMany: jest.fn().mockResolvedValue(mockItems),
                count: jest.fn().mockResolvedValue(mockTotal),
            };

            const options = {
                model: 'eventLog',
                dto: { page: 1, limit: 10 },
                customFilters: { status: 'confirmed' },
            };

            const result = await service.findManyWithPagination(options);

            expect(mockDatabaseService.eventLog.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { status: 'confirmed' },
                })
            );
        });

        it('should handle field transformation', async () => {
            const mockItems = [{ id: 1, value: 100 }];
            const mockTotal = 1;
            
            mockDatabaseService.addressBalance = {
                findMany: jest.fn().mockResolvedValue(mockItems),
                count: jest.fn().mockResolvedValue(mockTotal),
            };

            const options = {
                model: 'addressBalance',
                dto: { page: 1, limit: 10, balance: '100' },
                transformFields: {
                    balance: (value) => parseInt(value, 10),
                },
            };

            const result = await service.findManyWithPagination(options);

            expect(mockDatabaseService.addressBalance.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { balance: 100 },
                })
            );
        });
    });
});