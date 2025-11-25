import { Test, TestingModule } from '@nestjs/testing';
import { Erc20TransferController } from '../../src/modules/chain/controllers/erc20-transfer.controller';
import { ChainQueryService } from '../../src/modules/chain/services/chain-query.service';
import { PaginatedResult } from '../../src/common/interfaces/query-builder.interface';
import { Erc20TransferResponseDto } from '../../src/modules/chain/dtos/erc20-transfer-response.dto';

describe('Erc20TransferController', () => {
    let controller: Erc20TransferController;
    let chainQueryService: jest.Mocked<ChainQueryService>;

    beforeEach(async () => {
        const mockChainQueryService = {
            getErc20Transfers: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [Erc20TransferController],
            providers: [
                {
                    provide: ChainQueryService,
                    useValue: mockChainQueryService,
                },
            ],
        }).compile();

        controller = module.get<Erc20TransferController>(Erc20TransferController);
        chainQueryService = module.get(ChainQueryService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('listTransfers', () => {
        it('should return paginated ERC20 transfers', async () => {
            const mockQuery = { page: 1, limit: 10 };
            const mockResult: PaginatedResult<Erc20TransferResponseDto> = {
                items: [
                    {
                        id: '1',
                        txHash: '0xtx1',
                        blockNumber: '123',
                        logIndex: 1,
                        token: '0xtoken1',
                        from: '0xfrom',
                        to: '0xto',
                        value: '1000',
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

            chainQueryService.getErc20Transfers.mockResolvedValue(mockResult);

            const result = await controller.listTransfers(mockQuery);

            expect(chainQueryService.getErc20Transfers).toHaveBeenCalledWith(mockQuery);
            expect(result).toEqual(mockResult);
        });

        it('should handle empty result', async () => {
            const mockQuery = { page: 1, limit: 10 };
            const mockResult: PaginatedResult<Erc20TransferResponseDto> = {
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

            chainQueryService.getErc20Transfers.mockResolvedValue(mockResult);

            const result = await controller.listTransfers(mockQuery);

            expect(result.items).toHaveLength(0);
            expect(result.meta.total).toBe(0);
        });

        it('should pass through all query parameters', async () => {
            const mockQuery = {
                page: 2,
                limit: 5,
                txHash: '0xtx123',
                token: '0xtoken456',
                refAddress: '0xaddress789',
                sortBy: 'blockNumber',
                sortOrder: 'desc',
                search: 'test',
            };

            chainQueryService.getErc20Transfers.mockResolvedValue({
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

            await controller.listTransfers(mockQuery);

            expect(chainQueryService.getErc20Transfers).toHaveBeenCalledWith(mockQuery);
        });

        it('should handle transfers with null timestamp', async () => {
            const mockQuery = { page: 1, limit: 10 };
            const mockResult: PaginatedResult<Erc20TransferResponseDto> = {
                items: [
                    {
                        id: '2',
                        txHash: '0xtx2',
                        blockNumber: '124',
                        logIndex: 2,
                        token: '0xtoken2',
                        from: '0xfrom2',
                        to: '0xto2',
                        value: '2000',
                        timestamp: null,
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

            chainQueryService.getErc20Transfers.mockResolvedValue(mockResult);

            const result = await controller.listTransfers(mockQuery);

            expect(result.items[0].timestamp).toBeNull();
        });
    });
});
