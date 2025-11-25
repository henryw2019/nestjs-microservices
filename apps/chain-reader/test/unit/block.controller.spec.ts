import { Test, TestingModule } from '@nestjs/testing';
import { BlockController } from '../../src/modules/chain/controllers/block.controller';
import { ChainQueryService } from '../../src/modules/chain/services/chain-query.service';
import { NotFoundException } from '@nestjs/common';
import { PaginatedResult } from '../../src/common/interfaces/query-builder.interface';
import { BlockResponseDto } from '../../src/modules/chain/dtos/block-response.dto';

describe('BlockController', () => {
    let controller: BlockController;
    let chainQueryService: jest.Mocked<ChainQueryService>;

    beforeEach(async () => {
        const mockChainQueryService = {
            getBlocks: jest.fn(),
            getBlockByNumber: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [BlockController],
            providers: [
                {
                    provide: ChainQueryService,
                    useValue: mockChainQueryService,
                },
            ],
        }).compile();

        controller = module.get<BlockController>(BlockController);
        chainQueryService = module.get(ChainQueryService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('listBlocks', () => {
        it('should return paginated blocks', async () => {
            const mockQuery = { page: 1, limit: 10 };
            const mockResult: PaginatedResult<BlockResponseDto> = {
                items: [
                    {
                        number: '1',
                        hash: '0xhash1',
                        timestamp: '2024-01-01T00:00:00.000Z',
                        transactionCount: 2,
                        erc20TransferCount: 1,
                        eventLogCount: 3,
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

            chainQueryService.getBlocks.mockResolvedValue(mockResult);

            const result = await controller.listBlocks(mockQuery);

            expect(chainQueryService.getBlocks).toHaveBeenCalledWith(mockQuery);
            expect(result).toEqual(mockResult);
        });

        it('should handle empty result', async () => {
            const mockQuery = { page: 1, limit: 10 };
            const mockResult: PaginatedResult<BlockResponseDto> = {
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

            chainQueryService.getBlocks.mockResolvedValue(mockResult);

            const result = await controller.listBlocks(mockQuery);

            expect(result.items).toHaveLength(0);
            expect(result.meta.total).toBe(0);
        });

        it('should pass through all query parameters', async () => {
            const mockQuery = {
                page: 2,
                limit: 5,
                hash: '0x123',
                number: '123',
                fromNumber: '100',
                toNumber: '200',
                fromTimestamp: '2024-01-01T00:00:00Z',
                toTimestamp: '2024-01-02T00:00:00Z',
                sortBy: 'number',
                sortOrder: 'asc',
                search: 'test',
            };

            chainQueryService.getBlocks.mockResolvedValue({
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

            await controller.listBlocks(mockQuery);

            expect(chainQueryService.getBlocks).toHaveBeenCalledWith(mockQuery);
        });
    });

    describe('getBlock', () => {
        it('should return block when found', async () => {
            const blockNumber = '123';
            const mockBlock: BlockResponseDto = {
                number: '123',
                hash: '0xhash123',
                timestamp: '2024-01-01T00:00:00.000Z',
                transactionCount: 5,
                erc20TransferCount: 2,
                eventLogCount: 1,
            };

            chainQueryService.getBlockByNumber.mockResolvedValue(mockBlock);

            const result = await controller.getBlock(blockNumber);

            expect(chainQueryService.getBlockByNumber).toHaveBeenCalledWith(blockNumber);
            expect(result).toEqual(mockBlock);
        });

        it('should throw NotFoundException when block not found', async () => {
            const blockNumber = '999';

            chainQueryService.getBlockByNumber.mockResolvedValue(null);

            await expect(controller.getBlock(blockNumber)).rejects.toThrow(
                new NotFoundException(`Block ${blockNumber} not found`),
            );

            expect(chainQueryService.getBlockByNumber).toHaveBeenCalledWith(blockNumber);
        });

        it('should handle string block numbers correctly', async () => {
            const blockNumber = '0x1f'; // hexadecimal
            const mockBlock: BlockResponseDto = {
                number: '31',
                hash: '0xhash31',
                timestamp: '2024-01-01T00:00:00.000Z',
                transactionCount: 1,
                erc20TransferCount: 0,
                eventLogCount: 0,
            };

            chainQueryService.getBlockByNumber.mockResolvedValue(mockBlock);

            const result = await controller.getBlock(blockNumber);

            expect(chainQueryService.getBlockByNumber).toHaveBeenCalledWith(blockNumber);
            expect(result).toEqual(mockBlock);
        });
    });
});
