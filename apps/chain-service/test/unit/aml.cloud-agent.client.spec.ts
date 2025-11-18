import { AmlCloudAgentClient } from '../../src/modules/aml/aml.cloud-agent.client';
import { AmlScanRequestPayload } from '../../src/modules/aml/aml.types';

describe('AmlCloudAgentClient', () => {
    let client: AmlCloudAgentClient;
    let mockConfig: any;
    let loggerDebugSpy: jest.SpyInstance;
    let loggerErrorSpy: jest.SpyInstance;
    let fetchMock: jest.Mock;

    beforeEach(() => {
        // Mock fetch globally
        fetchMock = jest.fn();
        global.fetch = fetchMock as any;
        
        mockConfig = {
            cloudAgentUrl: 'https://aml-agent.example.com/api',
            cloudAgentApiKey: 'test-api-key',
            timeoutMs: 5000,
        };
        client = new AmlCloudAgentClient(mockConfig);
        loggerDebugSpy = jest.spyOn(client['logger'], 'debug').mockImplementation(() => undefined);
        loggerErrorSpy = jest.spyOn(client['logger'], 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('realtimeScan', () => {
        const mockPayload: AmlScanRequestPayload = {
            correlationId: 'test-123',
            from: { userId: 'user1', address: '0x123' },
            to: { userId: 'user2', address: '0x456' },
            amount: '1000',
        };

        it('should successfully call cloud agent and return PASSED decision', async () => {
            const mockResponse = {
                decision: 'PASSED',
                resultCode: '200',
                correlationId: 'test-123',
            };

            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await client.realtimeScan(mockPayload);

            expect(fetchMock).toHaveBeenCalledWith(
                'https://aml-agent.example.com/api/scan',
                expect.objectContaining({
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer test-api-key',
                    },
                    body: JSON.stringify(mockPayload),
                })
            );

            expect(result.decision).toBe('PASSED');
            expect(result.correlationId).toBe('test-123');
        });

        it('should map CLEAR status to PASSED', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ status: 'CLEAR' }),
            });

            const result = await client.realtimeScan(mockPayload);
            expect(result.decision).toBe('PASSED');
        });

        it('should map REVIEW status correctly', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ decision: 'REVIEW' }),
            });

            const result = await client.realtimeScan(mockPayload);
            expect(result.decision).toBe('REVIEW');
        });

        it('should map FAILED status correctly', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ decision: 'FAILED' }),
            });

            const result = await client.realtimeScan(mockPayload);
            expect(result.decision).toBe('FAILED');
        });

        it('should return ERROR when cloud agent URL is not configured', async () => {
            const clientWithoutUrl = new AmlCloudAgentClient({ 
                ...mockConfig, 
                cloudAgentUrl: '' 
            });
            
            const result = await clientWithoutUrl.realtimeScan(mockPayload);

            expect(result.decision).toBe('ERROR');
            expect(result.raw).toHaveProperty('error', 'Cloud agent URL not configured');
        });

        it('should return ERROR when API returns error status', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: false,
                status: 500,
                text: async () => 'Internal Server Error',
            });

            const result = await client.realtimeScan(mockPayload);

            expect(result.decision).toBe('ERROR');
            expect(result.raw).toHaveProperty('status', 500);
            expect(loggerErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('Cloud agent scan failed'),
                expect.anything()
            );
        });

        it('should handle network errors gracefully', async () => {
            fetchMock.mockRejectedValueOnce(new Error('Network error'));

            const result = await client.realtimeScan(mockPayload);

            expect(result.decision).toBe('ERROR');
            expect(loggerErrorSpy).toHaveBeenCalled();
        });

        it('should not include Authorization header when API key is not set', async () => {
            const clientWithoutKey = new AmlCloudAgentClient({ 
                ...mockConfig, 
                cloudAgentApiKey: '' 
            });

            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ decision: 'PASSED' }),
            });

            await clientWithoutKey.realtimeScan(mockPayload);

            expect(fetchMock).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
            );
        });
    });

    describe('queryResult', () => {
        it('should successfully query scan result by correlation ID', async () => {
            const mockResponse = {
                decision: 'PASSED',
                correlationId: 'test-456',
            };

            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await client.queryResult('test-456');

            expect(fetchMock).toHaveBeenCalledWith(
                'https://aml-agent.example.com/api/scan/test-456',
                expect.objectContaining({
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer test-api-key',
                    },
                })
            );

            expect(result.decision).toBe('PASSED');
            expect(result.correlationId).toBe('test-456');
        });

        it('should return ERROR when cloud agent URL is not configured', async () => {
            const clientWithoutUrl = new AmlCloudAgentClient({ 
                ...mockConfig, 
                cloudAgentUrl: '' 
            });
            
            const result = await clientWithoutUrl.queryResult('test-123');

            expect(result.decision).toBe('ERROR');
            expect(result.raw).toHaveProperty('error', 'Cloud agent URL not configured');
        });

        it('should return ERROR when query fails', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: false,
                status: 404,
                text: async () => 'Not Found',
            });

            const result = await client.queryResult('test-999');

            expect(result.decision).toBe('ERROR');
            expect(result.raw).toHaveProperty('status', 404);
        });
    });

    describe('decision mapping', () => {
        it('should map risk level LOW_RISK to PASSED', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ riskLevel: 'LOW_RISK' }),
            });

            const result = await client.realtimeScan({} as any);
            expect(result.decision).toBe('PASSED');
        });

        it('should map risk level MEDIUM_RISK to REVIEW', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ riskLevel: 'MEDIUM_RISK' }),
            });

            const result = await client.realtimeScan({} as any);
            expect(result.decision).toBe('REVIEW');
        });

        it('should map risk level HIGH_RISK to FAILED', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ riskLevel: 'HIGH_RISK' }),
            });

            const result = await client.realtimeScan({} as any);
            expect(result.decision).toBe('FAILED');
        });

        it('should default to ERROR for unknown status', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ decision: 'UNKNOWN_STATUS' }),
            });

            const result = await client.realtimeScan({} as any);
            expect(result.decision).toBe('ERROR');
        });
    });
});
