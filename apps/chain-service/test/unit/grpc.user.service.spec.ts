import { Test, TestingModule } from '@nestjs/testing';
import { GrpcUserService } from '../../src/services/user/grpc.user.service';
import { ClientGrpc } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';

describe('GrpcUserService', () => {
    let service: GrpcUserService;
    let clientGrpc: jest.Mocked<ClientGrpc>;
    let userServiceClient: any;

    beforeEach(async () => {
        userServiceClient = {
            GetUserById: jest.fn(),
            GetUserByEmail: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GrpcUserService,
                {
                    provide: 'USER_GRPC',
                    useValue: {
                        getService: jest.fn().mockReturnValue(userServiceClient),
                    },
                },
            ],
        }).compile();

        service = module.get<GrpcUserService>(GrpcUserService);
        clientGrpc = module.get('USER_GRPC');

        service.onModuleInit();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getUserById', () => {
        it('should return user when found', async () => {
            const mockResponse = { id: 'user-id', email: 'test@example.com' };
            userServiceClient.GetUserById.mockReturnValue(of(mockResponse));

            const result = await service.getUserById('user-id');

            expect(result).toEqual(mockResponse);
            expect(userServiceClient.GetUserById).toHaveBeenCalledWith({ id: 'user-id' });
        });

        it('should throw error when call fails', async () => {
            userServiceClient.GetUserById.mockReturnValue(
                throwError(() => new Error('gRPC Error')),
            );

            await expect(service.getUserById('user-id')).rejects.toThrow('gRPC Error');
        });
    });

    describe('getUserByEmail', () => {
        it('should return user when found', async () => {
            const mockResponse = { id: 'user-id', email: 'test@example.com' };
            userServiceClient.GetUserByEmail.mockReturnValue(of(mockResponse));

            const result = await service.getUserByEmail('test@example.com');

            expect(result).toEqual(mockResponse);
            expect(userServiceClient.GetUserByEmail).toHaveBeenCalledWith({
                email: 'test@example.com',
            });
        });

        it('should throw error when call fails', async () => {
            userServiceClient.GetUserByEmail.mockReturnValue(
                throwError(() => new Error('gRPC Error')),
            );

            await expect(service.getUserByEmail('test@example.com')).rejects.toThrow('gRPC Error');
        });
    });
});
