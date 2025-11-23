import { Test, TestingModule } from '@nestjs/testing';
import { KeyStoreService } from '../../src/modules/keystore/keystore.service';
import { DatabaseService } from '../../src/common/services/database.service';
import { ethers } from 'ethers';
import { NotFoundException } from '@nestjs/common';

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
    } as any;

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

    it('throws NotFoundException if no public keys found for user', async () => {
        (databaseMock.keyStore.findMany as jest.Mock).mockResolvedValue([]);
        await expect(service.getPublicByUserId('user_1')).rejects.toThrow(NotFoundException);
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

    it('throws NotFoundException if keystore not found by address', async () => {
        (databaseMock.keyStore.findFirst as jest.Mock).mockResolvedValue(null);
        await expect(service.getByAddress(fixedWallet.address)).rejects.toThrow(NotFoundException);
    });

    it('returns secret by user id', async () => {
        const record = { id: 'ks_1', privateKey: '0xpriv' };
        (databaseMock.keyStore.findFirst as jest.Mock).mockResolvedValue(record);
        const result = await service.getSecretByUserId('user_1');
        expect(result).toEqual(record);
    });

    it('throws NotFoundException if secret not found by user id', async () => {
        (databaseMock.keyStore.findFirst as jest.Mock).mockResolvedValue(null);
        await expect(service.getSecretByUserId('user_1')).rejects.toThrow(NotFoundException);
    });

    it('returns secret by user id and address', async () => {
        const record = { id: 'ks_1', privateKey: '0xpriv' };
        (databaseMock.keyStore.findFirst as jest.Mock).mockResolvedValue(record);
        const result = await service.getSecretByUserIdAndAddress('user_1', fixedWallet.address);
        expect(result).toEqual(record);
        expect(databaseMock.keyStore.findFirst).toHaveBeenCalledWith({
            where: { userId: 'user_1', address: ethers.getAddress(fixedWallet.address) },
        });
    });

    it('throws NotFoundException if secret not found by user id and address', async () => {
        (databaseMock.keyStore.findFirst as jest.Mock).mockResolvedValue(null);
        await expect(service.getSecretByUserIdAndAddress('user_1', fixedWallet.address)).rejects.toThrow(NotFoundException);
    });
});
