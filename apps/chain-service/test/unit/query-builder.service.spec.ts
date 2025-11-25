import { Test, TestingModule } from '@nestjs/testing';
import { QueryBuilderService } from '../../src/common/services/query-builder.service';
import { DatabaseService } from '../../src/common/services/database.service';

describe('QueryBuilderService', () => {
    let service: QueryBuilderService;
    let mockDatabaseService: any;

    beforeEach(async () => {
        mockDatabaseService = {
            user: {
                findMany: jest.fn(),
                count: jest.fn(),
            },
        };

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

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findManyWithPagination', () => {
        it('should return paginated results with default options', async () => {
            const mockItems = [{ id: 1, name: 'Test' }];
            const mockTotal = 1;
            mockDatabaseService.user.findMany.mockResolvedValue(mockItems);
            mockDatabaseService.user.count.mockResolvedValue(mockTotal);

            const options = {
                model: 'user',
                dto: {},
            };

            const result = await service.findManyWithPagination(options);

            expect(result).toEqual({
                items: mockItems,
                meta: {
                    page: 1,
                    limit: 10,
                    total: mockTotal,
                    totalPages: 1,
                    hasNextPage: false,
                    hasPreviousPage: false,
                },
            });
            expect(mockDatabaseService.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    skip: 0,
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    where: { isDeleted: false },
                }),
            );
        });

        it('should handle custom pagination and sorting', async () => {
            const mockItems = [{ id: 1, name: 'Test' }];
            const mockTotal = 20;
            mockDatabaseService.user.findMany.mockResolvedValue(mockItems);
            mockDatabaseService.user.count.mockResolvedValue(mockTotal);

            const options = {
                model: 'user',
                dto: {
                    page: 2,
                    limit: 5,
                    sortBy: 'name',
                    sortOrder: 'asc',
                },
            };

            const result = await service.findManyWithPagination(options);

            expect(result.meta).toEqual({
                page: 2,
                limit: 5,
                total: mockTotal,
                totalPages: 4,
                hasNextPage: true,
                hasPreviousPage: true,
            });
            expect(mockDatabaseService.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    skip: 5,
                    take: 5,
                    orderBy: { name: 'asc' },
                }),
            );
        });

        it('should build where clause with search', async () => {
            mockDatabaseService.user.findMany.mockResolvedValue([]);
            mockDatabaseService.user.count.mockResolvedValue(0);

            const options = {
                model: 'user',
                dto: { search: 'test' },
                searchFields: ['name', 'email'],
            };

            await service.findManyWithPagination(options);

            expect(mockDatabaseService.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        OR: [
                            { name: { contains: 'test', mode: 'insensitive' } },
                            { email: { contains: 'test', mode: 'insensitive' } },
                        ],
                    }),
                }),
            );
        });

        it('should build where clause with filters', async () => {
            mockDatabaseService.user.findMany.mockResolvedValue([]);
            mockDatabaseService.user.count.mockResolvedValue(0);

            const options = {
                model: 'user',
                dto: {
                    emailDomain: 'example.com',
                    createdDate: '2023-01-01',
                    roles: ['admin', 'user'],
                    firstName: 'John',
                    status: 'active',
                },
            };

            await service.findManyWithPagination(options);

            expect(mockDatabaseService.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        email: { endsWith: '@example.com' },
                        createdDate: { gte: new Date('2023-01-01') },
                        roles: { in: ['admin', 'user'] },
                        firstName: { contains: 'John', mode: 'insensitive' },
                        status: 'active',
                    }),
                }),
            );
        });

        it('should build include clause', async () => {
            mockDatabaseService.user.findMany.mockResolvedValue([]);
            mockDatabaseService.user.count.mockResolvedValue(0);

            const options = {
                model: 'user',
                dto: {},
                relations: ['profile', 'posts.comments'],
            };

            await service.findManyWithPagination(options);

            expect(mockDatabaseService.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    include: {
                        profile: true,
                        posts: {
                            include: {
                                comments: true,
                            },
                        },
                    },
                }),
            );
        });
    });
});
