import { Test, TestingModule } from '@nestjs/testing';
import { QueryBuilderService } from '../../src/common/services/query-builder.service';
import { DatabaseService } from '../../src/common/services/database.service';

describe('QueryBuilderService', () => {
    let service: QueryBuilderService;
    let mockDatabaseService: jest.Mocked<DatabaseService>;

    beforeEach(async () => {
        const mockDatabaseServiceProvider = {
            provide: DatabaseService,
            useValue: {
                post: {
                    findMany: jest.fn(),
                    count: jest.fn(),
                },
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [QueryBuilderService, mockDatabaseServiceProvider],
        }).compile();

        service = module.get<QueryBuilderService>(QueryBuilderService);
        mockDatabaseService = module.get(DatabaseService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });


});
