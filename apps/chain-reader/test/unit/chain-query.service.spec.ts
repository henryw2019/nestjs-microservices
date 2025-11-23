import { Test, TestingModule } from '@nestjs/testing';
import { ChainQueryService } from '../../src/modules/chain/services/chain-query.service';
import { DatabaseService } from '../../src/common/services/database.service';
import { QueryBuilderService } from '../../src/common/services/query-builder.service';
import { PaginatedResult } from '../../src/common/interfaces/query-builder.interface';

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
            tokenMeta: {
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

    describe('getBlockByNumber', () => {
        it('should map block to response DTO when found', async () => {
            (databaseService.block.findUnique as jest.Mock).mockResolvedValue({
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
            (databaseService.block.findUnique as jest.Mock).mockResolvedValue(null);

            const result = await service.getBlockByNumber('999');

            expect(result).toBeNull();
        });

        it('should handle block with zero counts', async () => {
            (databaseService.block.findUnique as jest.Mock).mockResolvedValue({
                number: BigInt(456),
                hash: '0xhash456',
                timestamp: new Date('2024-01-02T00:00:00Z'),
                _count: {
                    txs: 0,
                    erc20Transfers: 0,
                    eventLogs: 0,
                },
            });

            const result = await service.getBlockByNumber('456');

            expect(result).toEqual({
                number: '456',
                hash: '0xhash456',
                timestamp: '2024-01-02T00:00:00.000Z',
                transactionCount: 0,
                erc20TransferCount: 0,
                eventLogCount: 0,
            });
        });
    });

    describe('getBlocks', () => {
        it('should return paginated blocks', async () => {
            const mockBlocks = [
                {
                    number: BigInt(1),
                    hash: '0xhash1',
                    timestamp: new Date('2024-01-01T00:00:00Z'),
                    _count: { txs: 2, erc20Transfers: 1, eventLogs: 3 },
                },
                {
                    number: BigInt(2),
                    hash: '0xhash2',
                    timestamp: new Date('2024-01-01T01:00:00Z'),
                    _count: { txs: 1, erc20Transfers: 0, eventLogs: 1 },
                },
            ];

            const mockResult: PaginatedResult<any> = {
                items: mockBlocks,
                meta: {
                    page: 1,
                    limit: 10,
                    total: 2,
                    totalPages: 1,
                    hasNextPage: false,
                    hasPreviousPage: false,
                },
            };

            queryBuilder.findManyWithPagination.mockResolvedValue(mockResult);

            const result = await service.getBlocks({ page: 1, limit: 10 });

            expect(queryBuilder.findManyWithPagination).toHaveBeenCalledWith({
                model: 'block',
                dto: { page: 1, limit: 10 },
                defaultSort: { field: 'number', order: 'desc' },
                searchFields: ['hash'],
                customFilters: {},
                include: {
                    _count: {
                        select: {
                            txs: true,
                            erc20Transfers: true,
                            eventLogs: true,
                        },
                    },
                },
            });

            expect(result.items).toHaveLength(2);
            expect(result.items[0]).toEqual({
                number: '1',
                hash: '0xhash1',
                timestamp: '2024-01-01T00:00:00.000Z',
                transactionCount: 2,
                erc20TransferCount: 1,
                eventLogCount: 3,
            });
        });

        it('should filter by hash', async () => {
            queryBuilder.findManyWithPagination.mockResolvedValue({
                items: [],
                meta: { page: 1, limit: 25, total: 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
            });

            await service.getBlocks({ hash: '0x123' });

            expect(queryBuilder.findManyWithPagination).toHaveBeenCalledWith(
                expect.objectContaining({
                    customFilters: { hash: '0x123' },
                })
            );
        });

        it('should filter by block number', async () => {
            await service.getBlocks({ number: '123' });

            expect(queryBuilder.findManyWithPagination).toHaveBeenCalledWith(
                expect.objectContaining({
                    customFilters: { number: BigInt(123) },
                })
            );
        });

        it('should filter by number range', async () => {
            await service.getBlocks({ fromNumber: '100', toNumber: '200' });

            expect(queryBuilder.findManyWithPagination).toHaveBeenCalledWith(
                expect.objectContaining({
                    customFilters: {
                        number: {
                            gte: BigInt(100),
                            lte: BigInt(200),
                        },
                    },
                })
            );
        });

        it('should filter by timestamp range', async () => {
            await service.getBlocks({
                fromTimestamp: '2024-01-01T00:00:00Z',
                toTimestamp: '2024-01-02T00:00:00Z',
            });

            expect(queryBuilder.findManyWithPagination).toHaveBeenCalledWith(
                expect.objectContaining({
                    customFilters: {
                        timestamp: {
                            gte: new Date('2024-01-01T00:00:00Z'),
                            lte: new Date('2024-01-02T00:00:00Z'),
                        },
                    },
                })
            );
        });

        it('should handle pagination and sorting', async () => {
            await service.getBlocks({
                page: 2,
                limit: 5,
                sortBy: 'number',
                sortOrder: 'asc',
                search: 'test',
            });

            expect(queryBuilder.findManyWithPagination).toHaveBeenCalledWith(
                expect.objectContaining({
                    dto: {
                        page: 2,
                        limit: 5,
                        sortBy: 'number',
                        sortOrder: 'asc',
                        search: 'test',
                    },
                })
            );
        });
    });

    describe('getTransactions', () => {
        it('should return paginated transactions', async () => {
            const mockTxs = [
                {
                    hash: '0xtx1',
                    blockNumber: BigInt(123),
                    from: '0xfrom',
                    to: '0xto',
                    value: BigInt(1000),
                    gasUsed: BigInt(21000),
                    gasFee: BigInt(100),
                    balanceAfter: BigInt(900),
                    nonce: 1,
                    input: '0xdata',
                    status: 1,
                    timestamp: new Date('2024-01-01T00:00:00Z'),
                },
            ];

            queryBuilder.findManyWithPagination.mockResolvedValue({
                items: mockTxs,
                meta: { page: 1, limit: 25, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
            });

            const result = await service.getTransactions({});

            expect(queryBuilder.findManyWithPagination).toHaveBeenCalledWith({
                model: 'tx',
                dto: {},
                defaultSort: { field: 'blockNumber', order: 'desc' },
                searchFields: ['hash', 'from', 'to'],
                customFilters: {},
            });

            expect(result.items[0]).toEqual({
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
            });
        });

        it('should filter by transaction hash', async () => {
            await service.getTransactions({ hash: '0xtx123' });

            expect(queryBuilder.findManyWithPagination).toHaveBeenCalledWith(
                expect.objectContaining({
                    customFilters: { hash: '0xtx123' },
                })
            );
        });

        it('should filter by block number', async () => {
            await service.getTransactions({ blockNumber: '12345' });

            expect(queryBuilder.findManyWithPagination).toHaveBeenCalledWith(
                expect.objectContaining({
                    customFilters: { blockNumber: BigInt(12345) },
                })
            );
        });

        it('should filter by reference address', async () => {
            await service.getTransactions({ refAddress: '0xaddress' });

            expect(queryBuilder.findManyWithPagination).toHaveBeenCalledWith(
                expect.objectContaining({
                    customFilters: {
                        AND: [
                            {
                                OR: [
                                    { from: '0xaddress' },
                                    { to: '0xaddress' },
                                ],
                            },
                        ],
                    },
                })
            );
        });

        it('should handle transaction with null values', async () => {
            const mockTx = {
                hash: '0xtx2',
                blockNumber: BigInt(124),
                from: '0xfrom2',
                to: null,
                value: BigInt(0),
                gasUsed: null,
                gasFee: null,
                balanceAfter: null,
                nonce: null,
                input: null,
                status: null,
                timestamp: null,
            };

            queryBuilder.findManyWithPagination.mockResolvedValue({
                items: [mockTx],
                meta: { page: 1, limit: 25, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
            });

            const result = await service.getTransactions({});

            expect(result.items[0]).toEqual({
                hash: '0xtx2',
                blockNumber: '124',
                from: '0xfrom2',
                to: null,
                value: '0',
                gasUsed: null,
                gasFee: null,
                balanceAfter: null,
                nonce: null,
                input: null,
                status: null,
                timestamp: null,
            });
        });
    });

    describe('getTransactionByHash', () => {
        it('should return transaction when found', async () => {
            const mockTx = {
                hash: '0xtx123',
                blockNumber: BigInt(123),
                from: '0xfrom',
                to: '0xto',
                value: BigInt(1000),
            };

            (databaseService.tx.findUnique as jest.Mock).mockResolvedValue(mockTx);

            const result = await service.getTransactionByHash('0xtx123');

            expect(result).toEqual({
                hash: '0xtx123',
                blockNumber: '123',
                from: '0xfrom',
                to: '0xto',
                value: '1000',
                gasUsed: null,
                gasFee: null,
                balanceAfter: null,
                nonce: null,
                input: null,
                status: null,
                timestamp: null,
            });
        });

        it('should return null when transaction not found', async () => {
            (databaseService.tx.findUnique as jest.Mock).mockResolvedValue(null);

            const result = await service.getTransactionByHash('0xnonexistent');

            expect(result).toBeNull();
        });
    });

    describe('getErc20Transfers', () => {
        it('should return paginated ERC20 transfers', async () => {
            const mockTransfers = [
                {
                    id: BigInt(1),
                    txHash: '0xtx',
                    blockNumber: BigInt(123),
                    logIndex: 1,
                    token: '0xtoken',
                    from: '0xfrom',
                    to: '0xto',
                    value: BigInt(1000),
                    timestamp: new Date('2024-01-01T00:00:00Z'),
                },
            ];

            queryBuilder.findManyWithPagination.mockResolvedValue({
                items: mockTransfers,
                meta: { page: 1, limit: 25, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
            });

            const result = await service.getErc20Transfers({});

            expect(queryBuilder.findManyWithPagination).toHaveBeenCalledWith({
                model: 'eRC20Transfer',
                dto: {},
                defaultSort: { field: 'blockNumber', order: 'desc' },
                searchFields: ['txHash', 'token', 'from', 'to'],
                customFilters: {},
            });

            expect(result.items[0]).toEqual({
                id: '1',
                txHash: '0xtx',
                blockNumber: '123',
                logIndex: 1,
                token: '0xtoken',
                from: '0xfrom',
                to: '0xto',
                value: '1000',
                timestamp: '2024-01-01T00:00:00.000Z',
            });
        });

        it('should filter by transaction hash', async () => {
            await service.getErc20Transfers({ txHash: '0xtx123' });

            expect(queryBuilder.findManyWithPagination).toHaveBeenCalledWith(
                expect.objectContaining({
                    customFilters: { txHash: '0xtx123' },
                })
            );
        });

        it('should filter by token address', async () => {
            await service.getErc20Transfers({ token: '0xtoken123' });

            expect(queryBuilder.findManyWithPagination).toHaveBeenCalledWith(
                expect.objectContaining({
                    customFilters: { token: '0xtoken123' },
                })
            );
        });

        it('should filter by reference address', async () => {
            await service.getErc20Transfers({ refAddress: '0xaddress123' });

            expect(queryBuilder.findManyWithPagination).toHaveBeenCalledWith(
                expect.objectContaining({
                    customFilters: {
                        AND: [
                            {
                                OR: [
                                    { from: '0xaddress123' },
                                    { to: '0xaddress123' },
                                ],
                            },
                        ],
                    },
                })
            );
        });
    });

    describe('getEventLogs', () => {
        it('should return paginated event logs', async () => {
            const mockEventLogs = [
                {
                    id: BigInt(1),
                    chainId: 1,
                    blockNumber: BigInt(123),
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
                    timestamp: new Date('2024-01-01T00:00:00Z'),
                },
            ];

            queryBuilder.findManyWithPagination.mockResolvedValue({
                items: mockEventLogs,
                meta: { page: 1, limit: 25, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
            });

            const result = await service.getEventLogs({});

            expect(queryBuilder.findManyWithPagination).toHaveBeenCalledWith({
                model: 'eventLog',
                dto: {},
                defaultSort: { field: 'blockNumber', order: 'desc' },
                searchFields: ['eventName', 'eventSignature', 'contractAddress', 'txHash'],
                customFilters: {},
            });

            expect(result.items[0]).toEqual({
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
            });
        });

        it('should filter by chain ID', async () => {
            await service.getEventLogs({ chainId: '1' });

            expect(queryBuilder.findManyWithPagination).toHaveBeenCalledWith(
                expect.objectContaining({
                    customFilters: { chainId: 1 },
                })
            );
        });

        it('should filter by event name with case insensitive', async () => {
            await service.getEventLogs({ eventName: 'transfer' });

            expect(queryBuilder.findManyWithPagination).toHaveBeenCalledWith(
                expect.objectContaining({
                    customFilters: {
                        eventName: { equals: 'transfer', mode: 'insensitive' },
                    },
                })
            );
        });

        it('should filter by processed status', async () => {
            await service.getEventLogs({ processed: 'true' });

            expect(queryBuilder.findManyWithPagination).toHaveBeenCalledWith(
                expect.objectContaining({
                    customFilters: { processed: true },
                })
            );

            await service.getEventLogs({ processed: 'false' });

            expect(queryBuilder.findManyWithPagination).toHaveBeenCalledWith(
                expect.objectContaining({
                    customFilters: { processed: false },
                })
            );
        });

        it('should handle event logs with null args', async () => {
            const mockEventLog = {
                id: BigInt(2),
                chainId: 1,
                blockNumber: BigInt(124),
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
                timestamp: new Date('2024-01-02T00:00:00Z'),
            };

            queryBuilder.findManyWithPagination.mockResolvedValue({
                items: [mockEventLog],
                meta: { page: 1, limit: 25, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
            });

            const result = await service.getEventLogs({});

            expect(result.items[0]).toEqual({
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
            });
        });
    });

    describe('getAddressBalances', () => {
        it('should return paginated address balances', async () => {
            const mockBalances = [
                {
                    id: BigInt(1),
                    address: '0xaddress',
                    tokenAddress: '0xtoken',
                    balance: BigInt(1000),
                    lastUpdatedAt: new Date('2024-01-01T00:00:00Z'),
                },
            ];

            queryBuilder.findManyWithPagination.mockResolvedValue({
                items: mockBalances,
                meta: { page: 1, limit: 25, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
            });

            const result = await service.getAddressBalances({});

            expect(queryBuilder.findManyWithPagination).toHaveBeenCalledWith({
                model: 'addressBalance',
                dto: {},
                defaultSort: { field: 'lastUpdatedAt', order: 'desc' },
                allowedSortFields: ['lastUpdatedAt', 'address', 'tokenAddress', 'balance', 'id'],
                searchFields: ['address', 'tokenAddress'],
                customFilters: {},
            });

            expect(result.items[0]).toEqual({
                id: '1',
                address: '0xaddress',
                tokenAddress: '0xtoken',
                balance: '1000',
                lastUpdatedAt: '2024-01-01T00:00:00.000Z',
            });
        });

        it('should filter by address', async () => {
            await service.getAddressBalances({ address: '0xaddress123' });

            expect(queryBuilder.findManyWithPagination).toHaveBeenCalledWith(
                expect.objectContaining({
                    customFilters: { address: '0xaddress123' },
                })
            );
        });

        it('should filter by token address', async () => {
            await service.getAddressBalances({ tokenAddress: '0xtoken123' });

            expect(queryBuilder.findManyWithPagination).toHaveBeenCalledWith(
                expect.objectContaining({
                    customFilters: { tokenAddress: '0xtoken123' },
                })
            );
        });
    });

    describe('getTokenMeta', () => {
        it('should return paginated token metadata', async () => {
            const mockTokenMeta = [
                {
                    tokenAddress: '0xtoken',
                    name: 'Test Token',
                    symbol: 'TEST',
                    decimals: 18,
                    totalSupply: BigInt(1000000),
                    lastUpdatedAt: new Date('2024-01-01T00:00:00Z'),
                },
            ];

            queryBuilder.findManyWithPagination.mockResolvedValue({
                items: mockTokenMeta,
                meta: { page: 1, limit: 25, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
            });

            const result = await service.getTokenMeta({});

            expect(queryBuilder.findManyWithPagination).toHaveBeenCalledWith({
                model: 'tokenMeta',
                dto: {},
                defaultSort: { field: 'tokenAddress', order: 'asc' },
                searchFields: ['tokenAddress', 'symbol', 'name'],
                customFilters: {},
            });

            expect(result.items[0]).toEqual({
                tokenAddress: '0xtoken',
                name: 'Test Token',
                symbol: 'TEST',
                decimals: 18,
                totalSupply: '1000000',
                lastUpdatedAt: '2024-01-01T00:00:00.000Z',
            });
        });

        it('should handle token with null total supply', async () => {
            const mockTokenMeta = [
                {
                    tokenAddress: '0xtoken2',
                    name: 'Test Token 2',
                    symbol: 'TEST2',
                    decimals: 6,
                    totalSupply: null,
                    lastUpdatedAt: new Date('2024-01-01T00:00:00Z'),
                },
            ];

            queryBuilder.findManyWithPagination.mockResolvedValue({
                items: mockTokenMeta,
                meta: { page: 1, limit: 25, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
            });

            const result = await service.getTokenMeta({});

            expect(result.items[0]).toEqual({
                tokenAddress: '0xtoken2',
                name: 'Test Token 2',
                symbol: 'TEST2',
                decimals: 6,
                totalSupply: null,
                lastUpdatedAt: '2024-01-01T00:00:00.000Z',
            });
        });

        it('should filter by token address', async () => {
            await service.getTokenMeta({ tokenAddress: '0xtoken123' });

            expect(queryBuilder.findManyWithPagination).toHaveBeenCalledWith(
                expect.objectContaining({
                    customFilters: { tokenAddress: '0xtoken123' },
                })
            );
        });

        it('should filter by symbol with case insensitive', async () => {
            await service.getTokenMeta({ symbol: 'test' });

            expect(queryBuilder.findManyWithPagination).toHaveBeenCalledWith(
                expect.objectContaining({
                    customFilters: {
                        symbol: { contains: 'test', mode: 'insensitive' },
                    },
                })
            );
        });

        it('should filter by name with case insensitive', async () => {
            await service.getTokenMeta({ name: 'test token' });

            expect(queryBuilder.findManyWithPagination).toHaveBeenCalledWith(
                expect.objectContaining({
                    customFilters: {
                        name: { contains: 'test token', mode: 'insensitive' },
                    },
                })
            );
        });
    });

    describe('getTokenMetaByAddress', () => {
        it('should return token metadata when found', async () => {
            const mockTokenMeta = {
                tokenAddress: '0xtoken123',
                name: 'Test Token',
                symbol: 'TEST',
                decimals: 18,
                totalSupply: BigInt(1000000),
                lastUpdatedAt: new Date('2024-01-01T00:00:00Z'),
            };

            (databaseService.tokenMeta.findUnique as jest.Mock).mockResolvedValue(mockTokenMeta);

            const result = await service.getTokenMetaByAddress('0xtoken123');

            expect(result).toEqual({
                tokenAddress: '0xtoken123',
                name: 'Test Token',
                symbol: 'TEST',
                decimals: 18,
                totalSupply: '1000000',
                lastUpdatedAt: '2024-01-01T00:00:00.000Z',
            });
        });

        it('should return null when token metadata not found', async () => {
            (databaseService.tokenMeta.findUnique as jest.Mock).mockResolvedValue(null);

            const result = await service.getTokenMetaByAddress('0xnonexistent');

            expect(result).toBeNull();
        });
    });
});
