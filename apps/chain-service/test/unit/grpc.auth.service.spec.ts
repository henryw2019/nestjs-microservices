import { Test, TestingModule } from '@nestjs/testing';
import { GrpcAuthService } from '../../src/services/auth/grpc.auth.service';
import { of, throwError } from 'rxjs';

describe('GrpcAuthService', () => {
    let service: GrpcAuthService;
    let authServiceClient: {
        ValidateToken: jest.Mock;
        GetUserById: jest.Mock;
        GetUserByEmail: jest.Mock;
    };

    beforeEach(async () => {
        authServiceClient = {
            ValidateToken: jest.fn(),
            GetUserById: jest.fn(),
            GetUserByEmail: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GrpcAuthService,
                {
                    provide: 'AUTH_GRPC',
                    useValue: {
                        getService: jest.fn().mockReturnValue(authServiceClient),
                    },
                },
            ],
        }).compile();

        service = module.get<GrpcAuthService>(GrpcAuthService);
        await module.init();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('validateToken', () => {
        it('should validate token successfully', async () => {
            const mockResponse = { success: true, userId: '123' };
            authServiceClient.ValidateToken.mockReturnValue(of(mockResponse));

            const result = await service.validateToken('valid-token');

            expect(authServiceClient.ValidateToken).toHaveBeenCalledWith({
                token: 'valid-token',
            });
            expect(result).toEqual(mockResponse);
        });

        it('should throw when validation fails', async () => {
            const error = new Error('Invalid token');
            authServiceClient.ValidateToken.mockReturnValue(throwError(() => error));

            await expect(service.validateToken('invalid-token')).rejects.toThrow(error);
        });
    });
});
