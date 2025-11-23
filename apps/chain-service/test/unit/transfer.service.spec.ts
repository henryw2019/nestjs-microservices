import { Test, TestingModule } from '@nestjs/testing';
import { TransferService } from '../../src/modules/keystore/transfer.service';
import { KeyStoreService } from '../../src/modules/keystore/keystore.service';
import { AmlService } from '../../src/modules/aml/aml.service';
import { BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';

const mockSendTransaction = jest.fn();
const mockTransfer = jest.fn();

// Mock ethers
jest.mock('ethers', () => {
    return {
        getAddress: jest.fn((addr) => addr),
        JsonRpcProvider: jest.fn(),
        Wallet: jest.fn().mockImplementation(() => ({
            sendTransaction: mockSendTransaction,
        })),
        Contract: jest.fn().mockImplementation(() => ({
            transfer: mockTransfer,
        })),
    };
});

describe('TransferService', () => {
    let service: TransferService;
    let keyStoreService: any;
    let amlService: any;

    beforeEach(async () => {
        keyStoreService = {
            getSecretByUserIdAndAddress: jest.fn(),
            getByAddress: jest.fn(),
        };

        amlService = {
            scanTransfer: jest.fn(),
            shouldBlock: jest.fn(),
            linkTx: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TransferService,
                { provide: KeyStoreService, useValue: keyStoreService },
                { provide: AmlService, useValue: amlService },
            ],
        }).compile();

        service = module.get<TransferService>(TransferService);
        
        mockSendTransaction.mockReset();
        mockTransfer.mockReset();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('sendNative', () => {
        it('should send native currency successfully', async () => {
            const dto = {
                from: '0xSender',
                to: '0xReceiver',
                amount: '100',
            };

            keyStoreService.getSecretByUserIdAndAddress.mockResolvedValue({ privateKey: '0xKey' });
            keyStoreService.getByAddress.mockRejectedValue(new Error('Not found')); // External user
            amlService.scanTransfer.mockResolvedValue({ scanId: 'scan-id', decision: 'pass' });
            amlService.shouldBlock.mockReturnValue(false);
            mockSendTransaction.mockResolvedValue({ hash: '0xHash', wait: jest.fn() });

            const result = await service.sendNative('user-id', dto);

            expect(result.hash).toBe('0xHash');
            expect(amlService.scanTransfer).toHaveBeenCalled();
            expect(mockSendTransaction).toHaveBeenCalled();
        });

        it('should throw if AML blocks transfer', async () => {
            const dto = {
                from: '0xSender',
                to: '0xReceiver',
                amount: '100',
            };

            keyStoreService.getSecretByUserIdAndAddress.mockResolvedValue({ privateKey: '0xKey' });
            amlService.scanTransfer.mockResolvedValue({ scanId: 'scan-id', decision: 'block' });
            amlService.shouldBlock.mockReturnValue(true);

            await expect(service.sendNative('user-id', dto)).rejects.toThrow(BadRequestException);
        });

        it('handles error with JSON body', async () => {
            const dto = { from: '0xSender', to: '0xReceiver', amount: '100' };
            keyStoreService.getSecretByUserIdAndAddress.mockResolvedValue({ privateKey: '0xKey' });
            amlService.scanTransfer.mockResolvedValue({ scanId: 'scan-id', decision: 'pass' });
            
            const error = {
                body: JSON.stringify({ error: { message: 'Custom JSON error' } }),
            };
            mockSendTransaction.mockRejectedValue(error);

            await expect(service.sendNative('user-id', dto)).rejects.toThrow('Custom JSON error');
        });

        it('handles nested error messages', async () => {
            const dto = { from: '0xSender', to: '0xReceiver', amount: '100' };
            keyStoreService.getSecretByUserIdAndAddress.mockResolvedValue({ privateKey: '0xKey' });
            amlService.scanTransfer.mockResolvedValue({ scanId: 'scan-id', decision: 'pass' });
            
            const error = {
                error: { error: { message: 'Nested error' } },
            };
            mockSendTransaction.mockRejectedValue(error);

            await expect(service.sendNative('user-id', dto)).rejects.toThrow('Nested error');
        });

        it('maps UNPREDICTABLE_GAS_LIMIT to BadRequestException', async () => {
            const dto = { from: '0xSender', to: '0xReceiver', amount: '100' };
            keyStoreService.getSecretByUserIdAndAddress.mockResolvedValue({ privateKey: '0xKey' });
            amlService.scanTransfer.mockResolvedValue({ scanId: 'scan-id', decision: 'pass' });
            
            const error = {
                code: 'UNPREDICTABLE_GAS_LIMIT',
                message: 'Gas limit error',
            };
            mockSendTransaction.mockRejectedValue(error);

            await expect(service.sendNative('user-id', dto)).rejects.toThrow(BadRequestException);
        });

        it('maps SERVER_ERROR with client message to BadRequestException', async () => {
            const dto = { from: '0xSender', to: '0xReceiver', amount: '100' };
            keyStoreService.getSecretByUserIdAndAddress.mockResolvedValue({ privateKey: '0xKey' });
            amlService.scanTransfer.mockResolvedValue({ scanId: 'scan-id', decision: 'pass' });
            
            const error = {
                code: 'SERVER_ERROR',
                message: 'execution reverted: insufficient funds',
            };
            mockSendTransaction.mockRejectedValue(error);

            await expect(service.sendNative('user-id', dto)).rejects.toThrow(BadRequestException);
        });

        it('maps unknown error to InternalServerErrorException', async () => {
            const dto = { from: '0xSender', to: '0xReceiver', amount: '100' };
            keyStoreService.getSecretByUserIdAndAddress.mockResolvedValue({ privateKey: '0xKey' });
            amlService.scanTransfer.mockResolvedValue({ scanId: 'scan-id', decision: 'pass' });
            
            const error = {
                code: 'UNKNOWN_CODE',
                message: 'Unknown error',
            };
            mockSendTransaction.mockRejectedValue(error);

            await expect(service.sendNative('user-id', dto)).rejects.toThrow(InternalServerErrorException);
        });

        it('maps non-client error to InternalServerErrorException', async () => {
            const dto = { from: '0xSender', to: '0xReceiver', amount: '100' };
            keyStoreService.getSecretByUserIdAndAddress.mockResolvedValue({ privateKey: '0xKey' });
            amlService.scanTransfer.mockResolvedValue({ scanId: 'scan-id', decision: 'pass' });
            
            const error = {
                message: 'Something bad happened',
            };
            mockSendTransaction.mockRejectedValue(error);

            await expect(service.sendNative('user-id', dto)).rejects.toThrow(InternalServerErrorException);
            await expect(service.sendNative('user-id', dto)).rejects.toThrow('Something bad happened');
        });

        it('ignores AML link failure', async () => {
            const dto = { from: '0xSender', to: '0xReceiver', amount: '100' };
            keyStoreService.getSecretByUserIdAndAddress.mockResolvedValue({ privateKey: '0xKey' });
            amlService.scanTransfer.mockResolvedValue({ scanId: 'scan-id', decision: 'pass' });
            mockSendTransaction.mockResolvedValue({ hash: '0xHash', wait: jest.fn() });
            amlService.linkTx.mockRejectedValue(new Error('Link failed'));

            const result = await service.sendNative('user-id', dto);
            expect(result.hash).toBe('0xHash');
        });

        it('handles error with invalid JSON body', async () => {
            const dto = { from: '0xSender', to: '0xReceiver', amount: '100' };
            keyStoreService.getSecretByUserIdAndAddress.mockResolvedValue({ privateKey: '0xKey' });
            amlService.scanTransfer.mockResolvedValue({ scanId: 'scan-id', decision: 'pass' });
            
            const error = {
                body: 'invalid-json',
            };
            mockSendTransaction.mockRejectedValue(error);

            await expect(service.sendNative('user-id', dto)).rejects.toThrow(BadRequestException);
        });

        it('handles error with reason in message', async () => {
            const dto = { from: '0xSender', to: '0xReceiver', amount: '100' };
            keyStoreService.getSecretByUserIdAndAddress.mockResolvedValue({ privateKey: '0xKey' });
            amlService.scanTransfer.mockResolvedValue({ scanId: 'scan-id', decision: 'pass' });
            
            const error = {
                message: "Error: reason='Custom Reason'",
            };
            mockSendTransaction.mockRejectedValue(error);

            await expect(service.sendNative('user-id', dto)).rejects.toThrow('Custom Reason');
        });

        it('handles numeric error code in range', async () => {
            const dto = { from: '0xSender', to: '0xReceiver', amount: '100' };
            keyStoreService.getSecretByUserIdAndAddress.mockResolvedValue({ privateKey: '0xKey' });
            amlService.scanTransfer.mockResolvedValue({ scanId: 'scan-id', decision: 'pass' });
            
            const error = {
                code: -32005,
                message: 'Range error',
            };
            mockSendTransaction.mockRejectedValue(error);

            await expect(service.sendNative('user-id', dto)).rejects.toThrow(BadRequestException);
        });

        it('handles empty error object', async () => {
            const dto = { from: '0xSender', to: '0xReceiver', amount: '100' };
            keyStoreService.getSecretByUserIdAndAddress.mockResolvedValue({ privateKey: '0xKey' });
            amlService.scanTransfer.mockResolvedValue({ scanId: 'scan-id', decision: 'pass' });
            
            const error = {};
            mockSendTransaction.mockRejectedValue(error);

            await expect(service.sendNative('user-id', dto)).rejects.toThrow('Blockchain transaction failed');
        });

        it('handles error.error.body', async () => {
            const dto = { from: '0xSender', to: '0xReceiver', amount: '100' };
            keyStoreService.getSecretByUserIdAndAddress.mockResolvedValue({ privateKey: '0xKey' });
            amlService.scanTransfer.mockResolvedValue({ scanId: 'scan-id', decision: 'pass' });
            
            const error = {
                error: { body: JSON.stringify({ error: { message: 'Deep body error' } }) },
            };
            mockSendTransaction.mockRejectedValue(error);

            await expect(service.sendNative('user-id', dto)).rejects.toThrow('Deep body error');
        });
    });

    describe('sendErc20', () => {
        it('should send ERC20 tokens successfully', async () => {
            const dto = {
                from: '0xSender',
                to: '0xReceiver',
                amount: '100',
                token: '0xToken',
            };

            keyStoreService.getSecretByUserIdAndAddress.mockResolvedValue({ privateKey: '0xKey' });
            amlService.scanTransfer.mockResolvedValue({ scanId: 'scan-id', decision: 'pass' });
            amlService.shouldBlock.mockReturnValue(false);
            mockTransfer.mockResolvedValue({ hash: '0xHash', wait: jest.fn() });

            const result = await service.sendErc20('user-id', dto);

            expect(result.hash).toBe('0xHash');
            expect(mockTransfer).toHaveBeenCalled();
        });

        it('should throw if token address is missing', async () => {
            const dto = {
                from: '0xSender',
                to: '0xReceiver',
                amount: '100',
            };

            await expect(service.sendErc20('user-id', dto)).rejects.toThrow(NotFoundException);
        });

        it('ignores AML link failure', async () => {
            const dto = { from: '0xSender', to: '0xReceiver', amount: '100', token: '0xToken' };
            keyStoreService.getSecretByUserIdAndAddress.mockResolvedValue({ privateKey: '0xKey' });
            amlService.scanTransfer.mockResolvedValue({ scanId: 'scan-id', decision: 'pass' });
            mockTransfer.mockResolvedValue({ hash: '0xHash', wait: jest.fn() });
            amlService.linkTx.mockRejectedValue(new Error('Link failed'));

            const result = await service.sendErc20('user-id', dto);
            expect(result.hash).toBe('0xHash');
        });
    });

    describe('error normalization', () => {
        it('maps provider insufficient funds error to BadRequestException', () => {
            const providerError = {
                code: 'INSUFFICIENT_FUNDS',
                message: 'insufficient funds',
            };

            try {
                (service as any).handleTransferError(providerError);
            } catch (e) {
                expect(e).toBeInstanceOf(BadRequestException);
            }
        });
    });
});
