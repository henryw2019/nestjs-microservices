import { Test, TestingModule } from '@nestjs/testing';
import { TransactionController } from '../../src/modules/chain/controllers/transaction.controller';
import { ChainQueryService } from '../../src/modules/chain/services/chain-query.service';
import { NotFoundException } from '@nestjs/common';
import { PaginatedResult } from '../../src/common/interfaces/query-builder.interface';
import { TransactionResponseDto } from '../../src/modules/chain/dtos/transaction-response.dto';

describe('TransactionController', () => {
    let controller: TransactionController;
    let chainQueryService: jest.Mocked<ChainQueryService>;

    beforeEach(async () => {
        const mockChainQueryService = {
            getTransactions: jest.fn(),
            getTransactionByHash: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [TransactionController],
            providers: [
                {
                    provide: ChainQueryService,
                    useValue: mockChainQueryService,
                },
            ],
        }).compile();

        controller = module.get<TransactionController>(TransactionController);
        chainQueryService = module.get(ChainQueryService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('listTransactions', () => {
        it('should return paginated transactions', async () => {
            const mockQuery = { page: 1, limit: 10 };
            const mockResult: PaginatedResult<TransactionResponseDto> = {
                items: [
                    {
                        hash: '0xtx1',
                        blockNumber: '123',
                        from: '0xfrom',
                        to: '0xto',
                        value: '1000',
                        gasUsed: '21000',
                        gasFee: '100',
                        balanceAfter: '900',
                        nonce: 1,
                        input: '0xdata',
                        status: 1,
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

            chainQueryService.getTransactions.mockResolvedValue(mockResult);

            const result = await controller.listTransactions(mockQuery);

            expect(chainQueryService.getTransactions).toHaveBeenCalledWith(mockQuery);
            expect(result).toEqual(mockResult);
        });

        it('should handle empty result', async () => {
            const mockQuery = { page: 1, limit: 10 };
            const mockResult: PaginatedResult<TransactionResponseDto> = {
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

            chainQueryService.getTransactions.mockResolvedValue(mockResult);

            const result = await controller.listTransactions(mockQuery);

            expect(result.items).toHaveLength(0);
            expect(result.meta.total).toBe(0);
        });

        it('should pass through all query parameters', async () => {
            const mockQuery = {
                page: 2,
                limit: 5,
                hash: '0x123',
                blockNumber: '456',
                refAddress: '0x789',
                sortBy: 'blockNumber',
                sortOrder: 'desc',
                search: 'test',
            };

            chainQueryService.getTransactions.mockResolvedValue({
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

            await controller.listTransactions(mockQuery);

            expect(chainQueryService.getTransactions).toHaveBeenCalledWith(mockQuery);
        });
    });

    describe('getTransaction', () => {
        it('should return transaction when found', async () => {
            const txHash = '0xtx123';
            const mockTransaction: TransactionResponseDto = {
                hash: '0xtx123',
                blockNumber: '123',
                from: '0xfrom',
                to: '0xto',
                value: '1000',
                gasUsed: '21000',
                gasFee: '100',
                balanceAfter: '900',
                nonce: 1,
                input: '0xdata',
                status: 1,
                timestamp: '2024-01-01T00:00:00.000Z',
            };

            chainQueryService.getTransactionByHash.mockResolvedValue(mockTransaction);

            const result = await controller.getTransaction(txHash);

            expect(chainQueryService.getTransactionByHash).toHaveBeenCalledWith(txHash);
            expect(result).toEqual(mockTransaction);
        });

        it('should throw NotFoundException when transaction not found', async () => {
            const txHash = '0xnonexistent';

            chainQueryService.getTransactionByHash.mockResolvedValue(null);

            await expect(controller.getTransaction(txHash)).rejects.toThrow(
                new NotFoundException(`Transaction ${txHash} not found`),
            );

            expect(chainQueryService.getTransactionByHash).toHaveBeenCalledWith(txHash);
        });

        it('should handle transaction with null values', async () => {
            const txHash = '0xtx456';
            const mockTransaction: TransactionResponseDto = {
                hash: '0xtx456',
                blockNumber: '456',
                from: '0xfrom456',
                to: null,
                value: '0',
                gasUsed: null,
                gasFee: null,
                balanceAfter: null,
                nonce: null,
                input: null,
                status: null,
                timestamp: null,
            };

            chainQueryService.getTransactionByHash.mockResolvedValue(mockTransaction);

            const result = await controller.getTransaction(txHash);

            expect(result).toEqual(mockTransaction);
            expect(result.to).toBeNull();
            expect(result.gasUsed).toBeNull();
        });
    });
});
