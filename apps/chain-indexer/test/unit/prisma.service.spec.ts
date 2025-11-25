import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../src/prisma.service';

describe('PrismaService', () => {
    let service: PrismaService;

    beforeEach(async () => {
        // Mock environment variables
        process.env.INDEXER_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

        const module: TestingModule = await Test.createTestingModule({
            providers: [PrismaService],
        }).compile();

        service = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.restoreAllMocks();
        delete process.env.INDEXER_DATABASE_URL;
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should have client property', () => {
        expect(service.client).toBeDefined();
    });

    describe('onModuleInit', () => {
        it('should connect to database', async () => {
            const connectSpy = jest
                .spyOn(service.client, '$connect')
                .mockResolvedValue(undefined as any);

            await service.onModuleInit();

            expect(connectSpy).toHaveBeenCalled();
        });
    });

    describe('onModuleDestroy', () => {
        it('should disconnect from database', async () => {
            const disconnectSpy = jest
                .spyOn(service.client, '$disconnect')
                .mockResolvedValue(undefined as any);

            await service.onModuleDestroy();

            expect(disconnectSpy).toHaveBeenCalled();
        });
    });
});
