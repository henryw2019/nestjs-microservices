import { Test, TestingModule } from '@nestjs/testing';
import { AddressBalanceController } from '../../src/modules/chain/controllers/address-balance.controller';
import { ChainQueryService } from '../../src/modules/chain/services/chain-query.service';
import { PaginatedResult } from '../../src/common/interfaces/query-builder.interface';
import { AddressBalanceResponseDto } from '../../src/modules/chain/dtos/address-balance-response.dto';

describe('AddressBalanceController', () => {
    let controller: AddressBalanceController;
    let chainQueryService: jest.Mocked<ChainQueryService>;

    beforeEach(async () => {
        const mockChainQueryService = {
            getAddressBalances: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AddressBalanceController],
            providers: [
                {
                    provide: ChainQueryService,
                    useValue: mockChainQueryService,
                },
            ],
        }).compile();

        controller = module.get<AddressBalanceController>(AddressBalanceController);
        chainQueryService = module.get(ChainQueryService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('listAddressBalances', () => {
        it('should return paginated address balances', async () => {
            const mockQuery = { page: 1, limit: 10 };
            const mockResult: PaginatedResult<AddressBalanceResponseDto> = {
                items: [
                    {
                        id: '1',
                        address: '0xaddress1',
                        tokenAddress: '0xtoken1',
                        balance: '1000',
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

            chainQueryService.getAddressBalances.mockResolvedValue(mockResult);

            const result = await controller.listBalances(mockQuery);

            expect(chainQueryService.getAddressBalances).toHaveBeenCalledWith(mockQuery);
            expect(result).toEqual(mockResult);
        });

        it('should handle empty result', async () => {
            const mockQuery = { page: 1, limit: 10 };
            const mockResult: PaginatedResult<AddressBalanceResponseDto> = {
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

            chainQueryService.getAddressBalances.mockResolvedValue(mockResult);

            const result = await controller.listBalances(mockQuery);

            expect(result.items).toHaveLength(0);
            expect(result.meta.total).toBe(0);
        });

        it('should pass through all query parameters', async () => {
            const mockQuery = {
                page: 2,
                limit: 5,
                address: '0xaddress123',
                tokenAddress: '0xtoken456',
                sortBy: 'lastUpdatedAt',
                sortOrder: 'desc',
                search: 'test',
            };

            chainQueryService.getAddressBalances.mockResolvedValue({
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

            await controller.listAddressBalances(mockQuery);

            expect(chainQueryService.getAddressBalances).toHaveBeenCalledWith(mockQuery);
        });

        it('should handle zero balance', async () => {
            const mockQuery = { page: 1, limit: 10 };
            const mockResult: PaginatedResult<AddressBalanceResponseDto> = {
                items: [
                    {
                        id: '2',
                        address: '0xaddress2',
                        tokenAddress: '0xtoken2',
                        balance: '0',
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

            chainQueryService.getAddressBalances.mockResolvedValue(mockResult);

            const result = await controller.listBalances(mockQuery);

            expect(result.items[0].balance).toBe('0');
        });
    });
});
