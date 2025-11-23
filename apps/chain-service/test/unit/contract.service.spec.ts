import { Test, TestingModule } from '@nestjs/testing';
import { ContractService } from '../../src/modules/contract/contract.service';
import { DatabaseService } from '../../src/common/services/database.service';
import { KeyStoreService } from '../../src/modules/keystore/keystore.service';
import { BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';

// Mock fs
jest.mock('fs', () => ({
    promises: {
        writeFile: jest.fn(),
        readFile: jest.fn(),
        mkdir: jest.fn(),
        unlink: jest.fn(),
    },
}));

// Mock ethers
jest.mock('ethers', () => {
    return {
        getAddress: jest.fn((addr) => addr),
        Interface: jest.fn().mockImplementation(() => ({
            getFunction: jest.fn(),
        })),
        Contract: jest.fn().mockImplementation(() => ({
            callStatic: {},
        })),
        JsonRpcProvider: jest.fn(),
        Wallet: jest.fn(),
    };
});

describe('ContractService', () => {
    let service: ContractService;
    let databaseService: any;
    let keyStoreService: any;

    const mockContract = {
        id: 'contract-id',
        name: 'Test Contract',
        address: '0x1234567890123456789012345678901234567890',
        abiFile: 'abi-file.json',
        ownerId: 'owner-id',
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        databaseService = {
            contract: {
                create: jest.fn(),
                findMany: jest.fn(),
                findUnique: jest.fn(),
                findFirst: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
            },
        };

        keyStoreService = {
            getWallet: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ContractService,
                {
                    provide: DatabaseService,
                    useValue: databaseService,
                },
                {
                    provide: KeyStoreService,
                    useValue: keyStoreService,
                },
            ],
        }).compile();

        service = module.get<ContractService>(ContractService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should create a contract', async () => {
            const dto = {
                name: 'Test Contract',
                address: '0x1234567890123456789012345678901234567890',
                abi: [{ type: 'function', name: 'test' }],
                ownerId: 'owner-id',
            };

            databaseService.contract.findFirst.mockResolvedValue(null);
            databaseService.contract.create.mockResolvedValue(mockContract);
            (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
            (fs.mkdir as jest.Mock).mockResolvedValue(undefined);

            const result = await service.create(dto);

            expect(result).toEqual(expect.objectContaining({
                id: mockContract.id,
                name: mockContract.name,
                address: mockContract.address,
            }));
            expect(databaseService.contract.create).toHaveBeenCalled();
            expect(fs.writeFile).toHaveBeenCalled();
        });

        it('should throw if contract address already exists', async () => {
            const dto = {
                name: 'Test Contract',
                address: '0x1234567890123456789012345678901234567890',
                abi: [],
            };

            databaseService.contract.findFirst.mockResolvedValue(mockContract);

            await expect(service.create(dto)).rejects.toThrow(BadRequestException);
        });
        it('should throw InternalServerErrorException if persisting ABI fails', async () => {
            const dto = {
                name: 'Test Contract',
                address: '0x1234567890123456789012345678901234567890',
                abi: [{ type: 'function', name: 'test' }],
                ownerId: 'owner-id',
            };

            databaseService.contract.findFirst.mockResolvedValue(null);
            (fs.writeFile as jest.Mock).mockRejectedValue(new Error('Write failed'));
            (fs.mkdir as jest.Mock).mockResolvedValue(undefined);

            await expect(service.create(dto)).rejects.toThrow(InternalServerErrorException);
        });
        it('should throw BadRequestException for invalid address', async () => {
            const dto = {
                name: 'Test Contract',
                address: 'invalid-address',
                abi: [{ type: 'function', name: 'test' }],
                ownerId: 'owner-id',
            };
            
            const { getAddress } = require('ethers');
            getAddress.mockImplementationOnce(() => {
                throw new Error('Invalid address');
            });

            await expect(service.create(dto)).rejects.toThrow(BadRequestException);
        });
    });

    describe('findAll', () => {
        it('should return an array of contracts', async () => {
            databaseService.contract.findMany.mockResolvedValue([mockContract]);

            const result = await service.findAll();

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(mockContract.id);
        });
    });

    describe('findOne', () => {
        it('should return a contract', async () => {
            databaseService.contract.findUnique.mockResolvedValue(mockContract);

            const result = await service.findOne('contract-id');

            expect(result.id).toBe(mockContract.id);
        });

        it('should return a contract with abi', async () => {
            databaseService.contract.findUnique.mockResolvedValue(mockContract);
            (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify([{ type: 'function' }]));

            const result = await service.findOne('contract-id', true);

            expect(result.id).toBe(mockContract.id);
            expect(result.abi).toBeDefined();
        });

        it('should throw InternalServerErrorException if reading ABI fails', async () => {
            databaseService.contract.findUnique.mockResolvedValue(mockContract);
            (fs.readFile as jest.Mock).mockRejectedValue(new Error('Read failed'));

            await expect(service.findOne('contract-id', true)).rejects.toThrow(InternalServerErrorException);
        });

        it('should throw InternalServerErrorException if ABI is not an array', async () => {
            databaseService.contract.findUnique.mockResolvedValue(mockContract);
            (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify({ not: 'array' }));

            await expect(service.findOne('contract-id', true)).rejects.toThrow(InternalServerErrorException);
        });

        it('should throw if contract not found', async () => {
            databaseService.contract.findUnique.mockResolvedValue(null);

            await expect(service.findOne('contract-id')).rejects.toThrow(NotFoundException);
        });
    });

    describe('update', () => {
        it('should update a contract', async () => {
            const dto = {
                name: 'Updated Name',
                address: '0xNewAddress',
                ownerId: 'new-owner',
                abi: [{ type: 'event' }],
            };

            const updatedContract = { ...mockContract, ...dto };

            databaseService.contract.findUnique
                .mockResolvedValueOnce(mockContract) // Initial check
                .mockResolvedValueOnce(updatedContract); // Refreshed after update
            
            databaseService.contract.findFirst.mockResolvedValue(null);
            databaseService.contract.update.mockResolvedValue(updatedContract);
            (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
            (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(dto.abi));

            const result = await service.update('contract-id', dto);

            expect(databaseService.contract.update).toHaveBeenCalled();
            expect(fs.writeFile).toHaveBeenCalled();
            expect(result.name).toBe(dto.name);
        });

        it('should throw if new address already exists', async () => {
            const dto = { address: '0xExistingAddress' };
            databaseService.contract.findUnique.mockResolvedValue(mockContract);
            databaseService.contract.findFirst.mockResolvedValue({ id: 'other-id' });

            await expect(service.update('contract-id', dto)).rejects.toThrow(BadRequestException);
        });
        it('should throw BadRequestException for invalid address', async () => {
            databaseService.contract.findUnique.mockResolvedValue(mockContract);
            const dto = { address: 'invalid-address' };
            const { getAddress } = require('ethers');
            getAddress.mockImplementationOnce(() => {
                throw new Error('Invalid address');
            });
            await expect(service.update('contract-id', dto)).rejects.toThrow(BadRequestException);
        });
    });

    describe('remove', () => {
        it('should remove a contract and its abi file', async () => {
            databaseService.contract.findUnique.mockResolvedValue(mockContract);
            databaseService.contract.delete.mockResolvedValue(mockContract);
            (fs.unlink as jest.Mock).mockResolvedValue(undefined);

            await service.remove('contract-id');

            expect(databaseService.contract.delete).toHaveBeenCalledWith({ where: { id: 'contract-id' } });
            expect(fs.unlink).toHaveBeenCalled();
        });

        it('should handle error when deleting ABI file fails', async () => {
            databaseService.contract.findUnique.mockResolvedValue(mockContract);
            databaseService.contract.delete.mockResolvedValue(mockContract);
            (fs.unlink as jest.Mock).mockRejectedValue(new Error('Delete failed'));

            // Should not throw
            await service.remove('contract-id');

            expect(fs.unlink).toHaveBeenCalled();
        });

        it('should ignore ENOENT error when deleting ABI file', async () => {
            databaseService.contract.findUnique.mockResolvedValue(mockContract);
            databaseService.contract.delete.mockResolvedValue(mockContract);
            const error: any = new Error('File not found');
            error.code = 'ENOENT';
            (fs.unlink as jest.Mock).mockRejectedValue(error);

            await service.remove('contract-id');

            expect(fs.unlink).toHaveBeenCalled();
        });
    });

    describe('execute', () => {
        const mockAbi = [{ type: 'function', name: 'testFunc', stateMutability: 'view' }];
        const mockFragment = {
            name: 'testFunc',
            stateMutability: 'view',
            format: jest.fn().mockReturnValue('testFunc()'),
        };
        const mockFunction = jest.fn();

        beforeEach(() => {
            databaseService.contract.findUnique.mockResolvedValue(mockContract);
            (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockAbi));
            
            // Reset mocks
            jest.clearAllMocks();
            
            // Setup Ethers mocks
            const ethers = require('ethers');
            ethers.Interface.mockImplementation(() => ({
                getFunction: jest.fn().mockReturnValue(mockFragment),
            }));
            
            ethers.Contract.mockImplementation(() => ({
                testFunc: mockFunction,
                callStatic: {
                    testFunc: mockFunction,
                },
            }));
        });

        it('should execute a read-only function', async () => {
            const dto = {
                functionName: 'testFunc',
                params: ['arg1'],
            };

            mockFunction.mockResolvedValue('result');

            const result = await service.execute('contract-id', dto);

            expect(result).toEqual({
                functionName: 'testFunc',
                result: 'result',
                type: 'read',
            });
            expect(mockFunction).toHaveBeenCalledWith('arg1');
        });

        it('should execute a write function with overrides and wait for confirmation', async () => {
            const writeFragment = { ...mockFragment, stateMutability: 'nonpayable' };
            const ethers = require('ethers');
            ethers.Interface.mockImplementation(() => ({
                getFunction: jest.fn().mockReturnValue(writeFragment),
            }));

            const dto = {
                functionName: 'testFunc',
                params: ['arg1'],
                fromAddress: '0xSender',
                gasLimit: '100000',
                gasPrice: '20000000000',
                value: '1000000000000000000',
                nonce: '5',
                waitForConfirmation: true,
            };

            const mockReceipt = {
                hash: '0xHash',
                blockHash: '0xBlockHash',
                blockNumber: 123,
                from: '0xSender',
                to: mockContract.address,
                gasUsed: BigInt(21000),
                cumulativeGasUsed: BigInt(21000),
                status: 1,
                logs: [],
            };

            const mockTx = {
                hash: '0xHash',
                from: '0xSender',
                to: mockContract.address,
                nonce: 5,
                data: '0xData',
                gasLimit: BigInt(100000),
                gasPrice: BigInt(20000000000),
                value: BigInt(1000000000000000000),
                chainId: 31337,
                wait: jest.fn().mockResolvedValue(mockReceipt),
            };

            mockFunction.mockResolvedValue(mockTx);
            keyStoreService.getWallet = jest.fn().mockResolvedValue({ privateKey: '0xKey' });
            keyStoreService.getByAddress = jest.fn().mockResolvedValue({ privateKey: '0xKey' });

            const result = await service.execute('contract-id', dto);

            expect(result).toEqual(expect.objectContaining({
                transaction: expect.objectContaining({
                    hash: '0xHash',
                    gasLimit: '100000',
                }),
                receipt: expect.objectContaining({
                    transactionHash: '0xHash',
                    status: 1,
                }),
            }));
        });

        it('should throw BadRequestException for invalid BigInt in overrides', async () => {
            const writeFragment = { ...mockFragment, stateMutability: 'nonpayable' };
            const ethers = require('ethers');
            ethers.Interface.mockImplementation(() => ({
                getFunction: jest.fn().mockReturnValue(writeFragment),
            }));

            const dto = {
                functionName: 'testFunc',
                params: [],
                fromAddress: '0xSender',
                gasLimit: 'invalid-number',
            };

            keyStoreService.getByAddress = jest.fn().mockResolvedValue({ privateKey: '0xKey' });

            await expect(service.execute('contract-id', dto)).rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequestException for unsafe integer nonce', async () => {
            const writeFragment = { ...mockFragment, stateMutability: 'nonpayable' };
            const ethers = require('ethers');
            ethers.Interface.mockImplementation(() => ({
                getFunction: jest.fn().mockReturnValue(writeFragment),
            }));

            const dto = {
                functionName: 'testFunc',
                params: [],
                fromAddress: '0xSender',
                nonce: (Number.MAX_SAFE_INTEGER + 1).toString(),
            };

            keyStoreService.getByAddress = jest.fn().mockResolvedValue({ privateKey: '0xKey' });

            await expect(service.execute('contract-id', dto)).rejects.toThrow(BadRequestException);
        });

        it('should normalize complex results from read function', async () => {
            const dto = {
                functionName: 'testFunc',
                params: [],
            };

            const complexResult = {
                0: BigInt(123),
                1: 'string',
                id: BigInt(123),
                name: 'string',
                nested: [BigInt(456)],
            };

            mockFunction.mockResolvedValue(complexResult);

            const result = await service.execute('contract-id', dto);

            expect((result as any).result).toEqual({
                id: '123',
                name: 'string',
                nested: ['456'],
            });
        });

        it('should handle execution errors gracefully', async () => {
            const dto = {
                functionName: 'testFunc',
                params: [],
            };

            mockFunction.mockRejectedValue(new Error('Execution failed'));

            await expect(service.execute('contract-id', dto)).rejects.toThrow(BadRequestException);
        });

        it('should handle execution errors with non-Error objects', async () => {
            const dto = {
                functionName: 'testFunc',
                params: [],
            };

            mockFunction.mockRejectedValue({ message: 'Custom error' });

            await expect(service.execute('contract-id', dto)).rejects.toThrow(BadRequestException);
        });

        it('should throw if function not found in ABI', async () => {
            const ethers = require('ethers');
            ethers.Interface.mockImplementation(() => ({
                getFunction: jest.fn().mockReturnValue(null),
            }));

            const dto = {
                functionName: 'unknownFunc',
                params: [],
            };

            await expect(service.execute('contract-id', dto)).rejects.toThrow(NotFoundException);
        });
        it('should throw NotFoundException if function cannot be resolved on contract instance', async () => {
            const dto = {
                functionName: 'testFunc',
                params: [],
            };

            // Mock contract instance without the function
            const ethers = require('ethers');
            ethers.Contract.mockImplementation(() => ({
                // Empty object, no functions
                callStatic: {},
            }));

            await expect(service.execute('contract-id', dto)).rejects.toThrow(NotFoundException);
        });

        it('should handle write execution errors gracefully', async () => {
            const writeFragment = { ...mockFragment, stateMutability: 'nonpayable' };
            const ethers = require('ethers');
            ethers.Interface.mockImplementation(() => ({
                getFunction: jest.fn().mockReturnValue(writeFragment),
            }));

            const dto = {
                functionName: 'testFunc',
                params: [],
                fromAddress: '0xSender',
            };

            keyStoreService.getByAddress = jest.fn().mockResolvedValue({ privateKey: '0xKey' });
            mockFunction.mockRejectedValue(new Error('Write failed'));

            await expect(service.execute('contract-id', dto)).rejects.toThrow(BadRequestException);
        });

        it('should use default chainId if tx.chainId is missing', async () => {
            const writeFragment = { ...mockFragment, stateMutability: 'nonpayable' };
            const ethers = require('ethers');
            ethers.Interface.mockImplementation(() => ({
                getFunction: jest.fn().mockReturnValue(writeFragment),
            }));

            const dto = {
                functionName: 'testFunc',
                params: [],
                fromAddress: '0xSender',
                waitForConfirmation: false,
            };

            const mockTx = {
                hash: '0xHash',
                from: '0xSender',
                nonce: 5,
                data: '0xData',
                // chainId missing
            };

            mockFunction.mockResolvedValue(mockTx);
            keyStoreService.getByAddress = jest.fn().mockResolvedValue({ privateKey: '0xKey' });

            const result = await service.execute('contract-id', dto);
            expect((result as any).transaction.chainId).toBe(0);
        });

        it('should include confirmations in receipt', async () => {
            const writeFragment = { ...mockFragment, stateMutability: 'nonpayable' };
            const ethers = require('ethers');
            ethers.Interface.mockImplementation(() => ({
                getFunction: jest.fn().mockReturnValue(writeFragment),
            }));

            const dto = {
                functionName: 'testFunc',
                params: [],
                fromAddress: '0xSender',
                waitForConfirmation: true,
            };

            const mockReceipt = {
                hash: '0xHash',
                status: 1,
                logs: [],
            };
            const mockTx = {
                hash: '0xHash',
                from: '0xSender',
                wait: jest.fn().mockResolvedValue(mockReceipt),
            };

            mockFunction.mockResolvedValue(mockTx);
            keyStoreService.getByAddress = jest.fn().mockResolvedValue({ privateKey: '0xKey' });

            const result = await service.execute('contract-id', dto);
            expect((result as any).receipt.confirmations).toBe(1);
        });
    });

    describe('configuration', () => {
        it('should use configured ABI directory', async () => {
            process.env.CONTRACT_ABI_DIR = '/tmp/abis';
            const dto = {
                name: 'Test Contract',
                address: '0x1234567890123456789012345678901234567890',
                abi: [{ type: 'function', name: 'test' }],
                ownerId: 'owner-id',
            };

            databaseService.contract.findFirst.mockResolvedValue(null);
            databaseService.contract.create.mockResolvedValue(mockContract);
            (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
            (fs.mkdir as jest.Mock).mockResolvedValue(undefined);

            await service.create(dto);
            
            expect(fs.mkdir).toHaveBeenCalledWith('/tmp/abis', expect.any(Object));
            delete process.env.CONTRACT_ABI_DIR;
        });
    });
});

