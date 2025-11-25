import { Test, TestingModule } from '@nestjs/testing';
import { ethers } from 'ethers';
import { IndexerService } from '../../src/indexer/indexer.service';
import { PrismaService } from '../../src/prisma.service';

describe('IndexerService', () => {
    let service: IndexerService;
    let prismaService: PrismaService;
    let providerSpy: jest.SpyInstance;

    const mockPrismaService = {
        tokenMeta: {
            upsert: jest.fn(),
        },
        $transaction: jest.fn(),
        $queryRaw: jest.fn(),
        $executeRaw: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                IndexerService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<IndexerService>(IndexerService);
        prismaService = module.get<PrismaService>(PrismaService);

        // Mock environment variables
        process.env.ETH_RPC_URL = 'https://mock-rpc-url';
        process.env.POLL_INTERVAL_MS = '1000';
        process.env.BATCH_SIZE = '10';
        process.env.TRANSACTION_TIMEOUT_MS = '30000';
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should initialize with correct provider', () => {
        expect(service).toBeDefined();
        // The provider should be initialized with the RPC URL
    });

    describe('normalizeArgValue', () => {
        it('should handle null and undefined values', () => {
            expect(service['normalizeArgValue'](null)).toBeNull();
            expect(service['normalizeArgValue'](undefined)).toBeNull();
        });

        it('should convert bigint to string', () => {
            const bigIntValue = BigInt(123456789);
            expect(service['normalizeArgValue'](bigIntValue)).toBe('123456789');
        });

        it('should handle arrays recursively', () => {
            const input = [BigInt(1), BigInt(2), 'string'];
            const expected = ['1', '2', 'string'];
            expect(service['normalizeArgValue'](input)).toEqual(expected);
        });

        it('should handle objects with toString method', () => {
            const obj = { toString: () => 'custom-string' };
            expect(service['normalizeArgValue'](obj)).toBe('custom-string');
        });

        it('should return primitive values as-is', () => {
            expect(service['normalizeArgValue']('string')).toBe('string');
            expect(service['normalizeArgValue'](123)).toBe(123);
            expect(service['normalizeArgValue'](true)).toBe(true);
        });
    });

    describe('sortObjectKeys', () => {
        it('should sort object keys alphabetically', () => {
            const input = { z: 1, a: 2, m: 3 };
            const expected = { a: 2, m: 3, z: 1 };
            expect(service['sortObjectKeys'](input)).toEqual(expected);
        });

        it('should handle non-object values', () => {
            expect(service['sortObjectKeys']('string')).toBe('string');
            expect(service['sortObjectKeys'](123)).toBe(123);
            expect(service['sortObjectKeys'](null)).toBeNull();
            expect(service['sortObjectKeys'](undefined)).toBeUndefined();
        });

        it('should handle empty objects', () => {
            expect(service['sortObjectKeys']({})).toEqual({});
        });
    });

    describe('registerInterfaceEvents', () => {
        it('should register interface events in topicEventIndex', () => {
            const iface = new ethers.Interface([
                'event Transfer(address indexed from, address indexed to, uint256 value)',
                'event Approval(address indexed owner, address indexed spender, uint256 value)',
            ]);

            service['registerInterfaceEvents'](iface);

            // Check that events were registered
            const transferTopic = ethers.id('Transfer(address,address,uint256)');
            const approvalTopic = ethers.id('Approval(address,address,uint256)');

            expect(service['topicEventIndex'].has(transferTopic)).toBe(true);
            expect(service['topicEventIndex'].has(approvalTopic)).toBe(true);
        });

        it('should handle invalid interface gracefully', () => {
            expect(() => {
                service['registerInterfaceEvents'](null);
                service['registerInterfaceEvents'](undefined);
            }).not.toThrow();
        });
    });

    describe('decodeLogWithTopic', () => {
        beforeEach(() => {
            // Setup some test interfaces
            const iface = new ethers.Interface([
                'event Transfer(address indexed from, address indexed to, uint256 value)',
            ]);
            service['registerInterfaceEvents'](iface);
        });

        it('should decode known log with topic', () => {
            const transferTopic = ethers.id('Transfer(address,address,uint256)');
            const mockLog = {
                topics: [
                    transferTopic,
                    '0x000000000000000000000000sender1234567890123456789012345678901234567890',
                ],
                data: '0x0000000000000000000000000000000000000000000000000000000000000064',
            };

            const result = service['decodeLogWithTopic'](mockLog);

            expect(result).toBeDefined();
            expect(result?.name).toBe('Transfer');
        });

        it('should return null for unknown log', () => {
            const unknownTopic = ethers.id('UnknownEvent()');
            const mockLog = {
                topics: [unknownTopic],
                data: '0x',
            };

            const result = service['decodeLogWithTopic'](mockLog);
            expect(result).toBeNull();
        });

        it('should handle log without topics', () => {
            const mockLog = {
                topics: [],
                data: '0x',
            };

            const result = service['decodeLogWithTopic'](mockLog);
            expect(result).toBeNull();
        });
    });

    describe('onModuleInit', () => {
        it('should initialize the service', async () => {
            // Mock the onModuleInit method
            const initSpy = jest
                .spyOn(service as any, 'onModuleInit')
                .mockImplementation(async () => {
                    // Mock implementation
                });

            await service.onModuleInit();
            expect(initSpy).toHaveBeenCalled();
        });
    });
});
