import { Test, TestingModule } from '@nestjs/testing';
import { EventLogController } from '../../src/modules/chain/controllers/event-log.controller';
import { ChainQueryService } from '../../src/modules/chain/services/chain-query.service';
import { PaginatedResult } from '../../src/common/interfaces/query-builder.interface';
import { EventLogResponseDto } from '../../src/modules/chain/dtos/event-log-response.dto';

describe('EventLogController', () => {
    let controller: EventLogController;
    let chainQueryService: jest.Mocked<ChainQueryService>;

    beforeEach(async () => {
        const mockChainQueryService = {
            getEventLogs: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [EventLogController],
            providers: [
                {
                    provide: ChainQueryService,
                    useValue: mockChainQueryService,
                },
            ],
        }).compile();

        controller = module.get<EventLogController>(EventLogController);
        chainQueryService = module.get(ChainQueryService) as jest.Mocked<ChainQueryService>;
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('listEventLogs', () => {
        it('should return paginated event logs', async () => {
            const mockQuery = { page: 1, limit: 10 };
            const mockResult: PaginatedResult<EventLogResponseDto> = {
                items: [
                    {
                        id: '1',
                        chainId: 1,
                        blockNumber: '123',
                        blockHash: '0xblock',
                        txHash: '0xtx',
                        logIndex: 1,
                        contractAddress: '0xcontract',
                        eventName: 'Transfer',
                        eventSignature: 'Transfer(address,address,uint256)',
                        indexedArgs: { from: '0xfrom', to: '0xto' },
                        dataArgs: { value: '1000' },
                        raw: { data: '0xdata' },
                        processed: true,
                        timestamp: '2024-01-01T00:00:00.000Z',
                    },
                ],
                meta: {
                    page: 1,
                    limit: 10,
                    total: 1,
                    totalPages: 1,
                    hasNextPage: false,
                    hasPreviousPage: false,
                },
            };

            chainQueryService.getEventLogs.mockResolvedValue(mockResult);

            const result = await controller.listEventLogs(mockQuery);

            expect(chainQueryService.getEventLogs).toHaveBeenCalledWith(mockQuery);
            expect(result).toEqual(mockResult);
        });

        it('should handle empty result', async () => {
            const mockQuery = { page: 1, limit: 10 };
            const mockResult: PaginatedResult<EventLogResponseDto> = {
                items: [],
                meta: {
                    page: 1,
                    limit: 10,
                    total: 0,
                    totalPages: 0,
                    hasNextPage: false,
                    hasPreviousPage: false,
                },
            };

            chainQueryService.getEventLogs.mockResolvedValue(mockResult);

            const result = await controller.listEventLogs(mockQuery);

            expect(result.items).toHaveLength(0);
            expect(result.meta.total).toBe(0);
        });

        it('should pass through all query parameters', async () => {
            const mockQuery = {
                page: 2,
                limit: 5,
                chainId: '1',
                blockNumber: '123',
                txHash: '0xtx123',
                contractAddress: '0xcontract123',
                eventName: 'Transfer',
                eventSignature: 'Transfer(address,address,uint256)',
                processed: 'true',
                sortBy: 'blockNumber',
                sortOrder: 'desc',
                search: 'test',
            };

            chainQueryService.getEventLogs.mockResolvedValue({
                items: [],
                meta: {
                    page: 2,
                    limit: 5,
                    total: 0,
                    totalPages: 0,
                    hasNextPage: false,
                    hasPreviousPage: false,
                },
            });

            await controller.listEventLogs(mockQuery);

            expect(chainQueryService.getEventLogs).toHaveBeenCalledWith(mockQuery);
        });

        it('should handle event logs with null args', async () => {
            const mockQuery = { page: 1, limit: 10 };
            const mockResult: PaginatedResult<EventLogResponseDto> = {
                items: [
                    {
                        id: '2',
                        chainId: 1,
                        blockNumber: '124',
                        blockHash: '0xblock2',
                        txHash: '0xtx2',
                        logIndex: 2,
                        contractAddress: '0xcontract2',
                        eventName: 'Approval',
                        eventSignature: 'Approval(address,address,uint256)',
                        indexedArgs: null,
                        dataArgs: null,
                        raw: null,
                        processed: false,
                        timestamp: '2024-01-02T00:00:00.000Z',
                    },
                ],
                meta: {
                    page: 1,
                    limit: 10,
                    total: 1,
                    totalPages: 1,
                    hasNextPage: false,
                    hasPreviousPage: false,
                },
            };

            chainQueryService.getEventLogs.mockResolvedValue(mockResult);

            const result = await controller.listEventLogs(mockQuery);

            expect(result.items[0].indexedArgs).toBeNull();
            expect(result.items[0].dataArgs).toBeNull();
            expect(result.items[0].raw).toBeNull();
        });
    });
});