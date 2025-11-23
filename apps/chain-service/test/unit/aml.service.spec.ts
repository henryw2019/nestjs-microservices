import { Test, TestingModule } from '@nestjs/testing';
import { AmlService } from '../../src/modules/aml/aml.service';
import { DatabaseService } from '../../src/common/services/database.service';
import { AmlSoapClient } from '../../src/modules/aml/aml.soap.client';
import AmlConfig from '../../src/common/config/aml.config';

describe('AmlService', () => {
    let service: AmlService;
    let db: any;
    let soap: jest.Mocked<AmlSoapClient>;

    const mockAmlConfig = {
        enforcement: 'block_on_failure',
    };

    beforeEach(async () => {
        db = {
            amlScan: {
                create: jest.fn(),
                update: jest.fn(),
                findMany: jest.fn(),
            },
            amlScanEvent: {
                create: jest.fn(),
            },
            $transaction: jest.fn(),
        };

        soap = {
            realtimeScan: jest.fn(),
            queryResult: jest.fn(),
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AmlService,
                { provide: DatabaseService, useValue: db },
                { provide: AmlSoapClient, useValue: soap },
                { provide: AmlConfig.KEY, useValue: mockAmlConfig },
            ],
        }).compile();

        service = module.get<AmlService>(AmlService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('scanTransfer', () => {
        it('should create scan and return decision', async () => {
            const input = {
                from: { userId: 'u1', address: 'a1' },
                to: { userId: 'u2', address: 'a2' },
                amount: '100',
            };
            const mockScan = { id: 'scan-id' };
            const mockResponse = {
                decision: 'PASSED',
                scanId: 'scan-id',
                correlationId: 'corr-id',
                resultCode: 'OK',
            };

            db.amlScan.create.mockResolvedValue(mockScan);
            soap.realtimeScan.mockResolvedValue(mockResponse as any);
            db.$transaction.mockResolvedValue(undefined);

            const result = await service.scanTransfer(input);

            expect(result).toEqual({
                decision: 'PASSED',
                scanId: 'scan-id',
                correlationId: 'corr-id',
            });
            expect(db.amlScan.create).toHaveBeenCalled();
            expect(db.amlScanEvent.create).toHaveBeenCalled();
            expect(soap.realtimeScan).toHaveBeenCalled();
            expect(db.$transaction).toHaveBeenCalled();
        });
    });

    describe('shouldBlock', () => {
        it('should return false if enforcement is log_only', () => {
            (service as any).enforcement = 'log_only';
            expect(service.shouldBlock('FAILED')).toBe(false);
        });

        it('should return true if enforcement is block_on_review and decision is REVIEW', () => {
            (service as any).enforcement = 'block_on_review';
            expect(service.shouldBlock('REVIEW')).toBe(true);
        });

        it('should return true if enforcement is block_on_review and decision is FAILED', () => {
            (service as any).enforcement = 'block_on_review';
            expect(service.shouldBlock('FAILED')).toBe(true);
        });

        it('should return false if enforcement is block_on_review and decision is PASSED', () => {
            (service as any).enforcement = 'block_on_review';
            expect(service.shouldBlock('PASSED')).toBe(false);
        });

        it('should return true if enforcement is block_on_failure and decision is FAILED', () => {
            (service as any).enforcement = 'block_on_failure';
            expect(service.shouldBlock('FAILED')).toBe(true);
        });

        it('should return false if enforcement is block_on_failure and decision is REVIEW', () => {
            (service as any).enforcement = 'block_on_failure';
            expect(service.shouldBlock('REVIEW')).toBe(false);
        });
    });

    describe('linkTx', () => {
        it('should update scan with txHash', async () => {
            await service.linkTx('scan-id', 'tx-hash');
            expect(db.amlScan.update).toHaveBeenCalledWith({
                where: { id: 'scan-id' },
                data: { txHash: 'tx-hash' },
            });
        });
    });

    describe('pollPendingOnce', () => {
        it('should poll pending scans and persist response', async () => {
            const mockScans = [{ id: 's1', correlationId: 'c1' }];
            const mockResponse = { decision: 'PASSED' };

            db.amlScan.findMany.mockResolvedValue(mockScans);
            soap.queryResult.mockResolvedValue(mockResponse as any);

            await service.pollPendingOnce();

            expect(db.amlScan.findMany).toHaveBeenCalled();
            expect(soap.queryResult).toHaveBeenCalledWith('c1');
            expect(db.$transaction).toHaveBeenCalled();
        });

        it('should handle errors during polling', async () => {
            const mockScans = [{ id: 's1', correlationId: 'c1' }];
            db.amlScan.findMany.mockResolvedValue(mockScans);
            soap.queryResult.mockRejectedValue(new Error('Poll failed'));

            await service.pollPendingOnce();

            expect(soap.queryResult).toHaveBeenCalled();
            // Should not throw, just log warning
        });
    });

    describe('mapDecisionToStatus', () => {
        it('should map decisions correctly', () => {
            expect((service as any).mapDecisionToStatus('PASSED')).toBe('PASSED');
            expect((service as any).mapDecisionToStatus('REVIEW')).toBe('REVIEW');
            expect((service as any).mapDecisionToStatus('FAILED')).toBe('FAILED');
            expect((service as any).mapDecisionToStatus('PENDING')).toBe('PENDING');
            expect((service as any).mapDecisionToStatus('UNKNOWN')).toBe('ERROR');
        });
    });
});
