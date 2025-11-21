import { Test, TestingModule } from '@nestjs/testing';
import { KeyStoreService } from '../../src/modules/keystore/keystore.service';
import { DatabaseService } from '../../src/common/services/database.service';
import { ethers } from 'ethers';

describe('KeyStoreService', () => {
    let service: KeyStoreService;
    const databaseMock = {
        keyStore: {
            create: jest.fn(),
            findMany: jest.fn(),
            findFirst: jest.fn(),
        },
    } as unknown as DatabaseService;

    const fixedWallet = {
        address: '0x1111111111111111111111111111111111111111',
        privateKey: '0xabcdef',
    } as ethers.Wallet;

    beforeEach(async () => {
        jest.spyOn(ethers.Wallet, 'createRandom').mockReturnValue(fixedWallet);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                KeyStoreService,
                {
                    provide: DatabaseService,
                    useValue: databaseMock,
                },
            ],
        }).compile();

        service = module.get<KeyStoreService>(KeyStoreService);
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('creates a new address for the user and sanitizes the response', async () => {
        const createdRecord = {
            id: 'ks_1',
            userId: 'user_1',
            address: fixedWallet.address,
            privateKey: fixedWallet.privateKey,
            createdAt: new Date('2024-01-01T00:00:00.000Z'),
        };

        (databaseMock.keyStore.create as jest.Mock).mockResolvedValue(createdRecord);

        const result = await service.createForUser('user_1');

        expect(databaseMock.keyStore.create).toHaveBeenCalledWith({
            data: {
                userId: 'user_1',
                address: ethers.getAddress(fixedWallet.address),
                privateKey: fixedWallet.privateKey,
                accountName: null,
            },
        });
        expect(result).toEqual({
            id: 'ks_1',
            userId: 'user_1',
            address: ethers.getAddress(fixedWallet.address),
            createdAt: createdRecord.createdAt,
        });
    });

    it('returns all sanitized addresses for a user', async () => {
        const records = [
            {
                id: 'ks_1',
                userId: 'user_1',
                address: '0x2222222222222222222222222222222222222222',
                privateKey: '0xpriv',
                createdAt: new Date('2024-01-01T00:00:00.000Z'),
            },
        ];

        (databaseMock.keyStore.findMany as jest.Mock).mockResolvedValue(records);

        const result = await service.getPublicByUserId('user_1');

        expect(databaseMock.keyStore.findMany).toHaveBeenCalledWith({
            where: { userId: 'user_1' },
            orderBy: { createdAt: 'asc' },
        });
        expect(result).toEqual([
            {
                id: 'ks_1',
                userId: 'user_1',
                address: '0x2222222222222222222222222222222222222222',
                createdAt: records[0].createdAt,
            },
        ]);
    });

    it('normalizes address before fetching secrets', async () => {
        const record = {
            id: 'ks_1',
            userId: 'user_1',
            address: '0x3333333333333333333333333333333333333333',
            privateKey: '0xpriv',
            createdAt: new Date('2024-01-01T00:00:00.000Z'),
        };

        (databaseMock.keyStore.findFirst as jest.Mock).mockResolvedValue(record);

        const result = await service.getSecretByUserIdAndAddress(
            'user_1',
            '0x3333333333333333333333333333333333333333',
        );

        expect(databaseMock.keyStore.findFirst).toHaveBeenCalledWith({
            where: {
                userId: 'user_1',
                address: ethers.getAddress('0x3333333333333333333333333333333333333333'),
            },
        });
        expect(result).toBe(record);
    });
});
