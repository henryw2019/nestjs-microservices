import { Test, TestingModule } from '@nestjs/testing';
import { GrpcClientService } from 'nestjs-grpc';
import { GrpcAuthService } from '../../src/services/auth/grpc.auth.service';

describe('GrpcAuthService', () => {
    let service: GrpcAuthService;
    let grpcClientService: jest.Mocked<GrpcClientService>;

    beforeEach(async () => {
        grpcClientService = {
            call: jest.fn(),
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GrpcAuthService,
                {
                    provide: GrpcClientService,
                    useValue: grpcClientService,
                },
            ],
        }).compile();

        service = module.get<GrpcAuthService>(GrpcAuthService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('validateToken', () => {
        it('should validate token successfully', async () => {
            const mockResponse = { success: true } as any;
            grpcClientService.call.mockResolvedValue(mockResponse);

            const result = await service.validateToken('valid-token');

            expect(grpcClientService.call).toHaveBeenCalledWith('AuthService', 'ValidateToken', {
                token: 'valid-token',
            });
            expect(result).toEqual(mockResponse);
        });

        it('should throw when validation fails', async () => {
            const error = new Error('Invalid token');
            grpcClientService.call.mockRejectedValue(error);

            await expect(service.validateToken('invalid-token')).rejects.toThrow(error);
            expect(grpcClientService.call).toHaveBeenCalledWith('AuthService', 'ValidateToken', {
                token: 'invalid-token',
            });
        });
    });

    describe('getUserById', () => {
        it('should get user by id successfully', async () => {
            const mockUser = { id: 'user-1', email: 'user@example.com' };
            grpcClientService.call.mockResolvedValue(mockUser);

            const result = await service.getUserById('user-1');

            expect(grpcClientService.call).toHaveBeenCalledWith('AuthService', 'GetUserById', {
                id: 'user-1',
            });
            expect(result).toEqual(mockUser);
        });

        it('should throw when user lookup fails', async () => {
            const error = new Error('User not found');
            grpcClientService.call.mockRejectedValue(error);

            await expect(service.getUserById('non-existent')).rejects.toThrow(error);
            expect(grpcClientService.call).toHaveBeenCalledWith('AuthService', 'GetUserById', {
                id: 'non-existent',
            });
        });
    });

    describe('getUserByEmail', () => {
        it('should get user by email successfully', async () => {
            const mockUser = { id: 'user-1', email: 'user@example.com' };
            grpcClientService.call.mockResolvedValue(mockUser);

            const result = await service.getUserByEmail('user@example.com');

            expect(grpcClientService.call).toHaveBeenCalledWith('AuthService', 'GetUserByEmail', {
                email: 'user@example.com',
            });
            expect(result).toEqual(mockUser);
        });

        it('should throw when email lookup fails', async () => {
            const error = new Error('Email not found');
            grpcClientService.call.mockRejectedValue(error);

            await expect(service.getUserByEmail('nonexistent@example.com')).rejects.toThrow(error);
            expect(grpcClientService.call).toHaveBeenCalledWith('AuthService', 'GetUserByEmail', {
                email: 'nonexistent@example.com',
            });
        });
    });
});
