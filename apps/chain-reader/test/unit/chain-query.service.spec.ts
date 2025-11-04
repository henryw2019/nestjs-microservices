import { Test, TestingModule } from '@nestjs/testing';
import { ChainQueryService } from '../../src/modules/chain/services/chain-query.service';
import { DatabaseService } from '../../src/common/services/database.service';
import { QueryBuilderService } from '../../src/common/services/query-builder.service';

const createQueryBuilderMock = () => ({
    findManyWithPagination: jest.fn().mockResolvedValue({
        items: [],
        meta: {
            page: 1,
            limit: 25,
            total: 0,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
        },
    }),
});

describe('ChainQueryService', () => {
    let service: ChainQueryService;
    let databaseService: jest.Mocked<Partial<DatabaseService>>;
    let queryBuilder: ReturnType<typeof createQueryBuilderMock>;

    beforeEach(async () => {
        databaseService = {
            block: {
                findUnique: jest.fn(),
            },
            tx: {
                findUnique: jest.fn(),
            },
        } as unknown as jest.Mocked<Partial<DatabaseService>>;

        queryBuilder = createQueryBuilderMock();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ChainQueryService,
                { provide: DatabaseService, useValue: databaseService },
                { provide: QueryBuilderService, useValue: queryBuilder },
            ],
        }).compile();

        service = module.get<ChainQueryService>(ChainQueryService);
    });

    it('should map block to response DTO when found', async () => {
        (databaseService.block!.findUnique as jest.Mock).mockResolvedValue({
            number: BigInt(123),
            hash: '0xhash',
            timestamp: new Date('2024-01-01T00:00:00Z'),
            _count: {
                txs: 2,
                erc20Transfers: 1,
                eventLogs: 3,
            },
        });

        const result = await service.getBlockByNumber('123');

        expect(result).toEqual({
            number: '123',
            hash: '0xhash',
            timestamp: '2024-01-01T00:00:00.000Z',
            transactionCount: 2,
            erc20TransferCount: 1,
            eventLogCount: 3,
        });
    });

    it('should return null when block not found', async () => {
        (databaseService.block!.findUnique as jest.Mock).mockResolvedValue(null);

        const result = await service.getBlockByNumber('999');

        expect(result).toBeNull();
    });
});
