import { Test, TestingModule } from '@nestjs/testing';
import { TokenMetaController } from '../../src/modules/chain/controllers/token-meta.controller';
import { ChainQueryService } from '../../src/modules/chain/services/chain-query.service';
import { NotFoundException } from '@nestjs/common';
import { PaginatedResult } from '../../src/common/interfaces/query-builder.interface';
import { TokenMetaResponseDto } from '../../src/modules/chain/dtos/token-meta-response.dto';

describe('TokenMetaController', () => {
    let controller: TokenMetaController;
    let chainQueryService: jest.Mocked<ChainQueryService>;

    beforeEach(async () => {
        const mockChainQueryService = {
            getTokenMeta: jest.fn(),
            getTokenMetaByAddress: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [TokenMetaController],
            providers: [
                {
                    provide: ChainQueryService,
                    useValue: mockChainQueryService,
                },
            ],
        }).compile();

        controller = module.get<TokenMetaController>(TokenMetaController);
        chainQueryService = module.get(ChainQueryService) as jest.Mocked<ChainQueryService>;
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('listTokenMeta', () => {
        it('should return paginated token metadata', async () => {
            const mockQuery = { page: 1, limit: 10 };
            const mockResult: PaginatedResult<TokenMetaResponseDto> = {
                items: [
                    {
                        tokenAddress: '0xtoken1',
                        name: 'Test Token',
                        symbol: 'TEST',
                        decimals: 18,
                        totalSupply: '1000000',
                        lastUpdatedAt: '2024-01-01T00:00:00.000Z',
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

            chainQueryService.getTokenMeta.mockResolvedValue(mockResult);

            const result = await controller.listTokenMeta(mockQuery);

            expect(chainQueryService.getTokenMeta).toHaveBeenCalledWith(mockQuery);
            expect(result).toEqual(mockResult);
        });

        it('should handle empty result', async () => {
            const mockQuery = { page: 1, limit: 10 };
            const mockResult: PaginatedResult<TokenMetaResponseDto> = {
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

            chainQueryService.getTokenMeta.mockResolvedValue(mockResult);

            const result = await controller.listTokenMeta(mockQuery);

            expect(result.items).toHaveLength(0);
            expect(result.meta.total).toBe(0);
        });

        it('should pass through all query parameters', async () => {
            const mockQuery = {
                page: 2,
                limit: 5,
                tokenAddress: '0xtoken123',
                symbol: 'TEST',
                name: 'Test Token',
                sortBy: 'tokenAddress',
                sortOrder: 'asc',
                search: 'test',
            };

            chainQueryService.getTokenMeta.mockResolvedValue({
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

            await controller.listTokenMeta(mockQuery);

            expect(chainQueryService.getTokenMeta).toHaveBeenCalledWith(mockQuery);
        });

        it('should handle token with null total supply', async () => {
            const mockQuery = { page: 1, limit: 10 };
            const mockResult: PaginatedResult<TokenMetaResponseDto> = {
                items: [
                    {
                        tokenAddress: '0xtoken2',
                        name: 'Test Token 2',
                        symbol: 'TEST2',
                        decimals: 6,
                        totalSupply: null,
                        lastUpdatedAt: '2024-01-01T00:00:00.000Z',
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

            chainQueryService.getTokenMeta.mockResolvedValue(mockResult);

            const result = await controller.listTokenMeta(mockQuery);

            expect(result.items[0].totalSupply).toBeNull();
        });
    });

    describe('getTokenMeta', () => {
        it('should return token metadata when found', async () => {
            const tokenAddress = '0xtoken123';
            const mockTokenMeta: TokenMetaResponseDto = {
                tokenAddress: '0xtoken123',
                name: 'Test Token',
                symbol: 'TEST',
                decimals: 18,
                totalSupply: '1000000',
                lastUpdatedAt: '2024-01-01T00:00:00.000Z',
            };

            chainQueryService.getTokenMetaByAddress.mockResolvedValue(mockTokenMeta);

            const result = await controller.getTokenMeta(tokenAddress);

            expect(chainQueryService.getTokenMetaByAddress).toHaveBeenCalledWith(tokenAddress);
            expect(result).toEqual(mockTokenMeta);
        });

        it('should throw NotFoundException when token metadata not found', async () => {
            const tokenAddress = '0xnonexistent';

            chainQueryService.getTokenMetaByAddress.mockResolvedValue(null);

            await expect(controller.getTokenMeta(tokenAddress)).rejects.toThrow(
                new NotFoundException(`Token metadata for ${tokenAddress} not found`)
            );

            expect(chainQueryService.getTokenMetaByAddress).toHaveBeenCalledWith(tokenAddress);
        });

        it('should handle token with no total supply', async () => {
            const tokenAddress = '0xtoken456';
            const mockTokenMeta: TokenMetaResponseDto = {
                tokenAddress: '0xtoken456',
                name: 'No Supply Token',
                symbol: 'NOSUP',
                decimals: 0,
                totalSupply: null,
                lastUpdatedAt: '2024-01-01T00:00:00.000Z',
            };

            chainQueryService.getTokenMetaByAddress.mockResolvedValue(mockTokenMeta);

            const result = await controller.getTokenMeta(tokenAddress);

            expect(result.totalSupply).toBeNull();
        });
    });
});