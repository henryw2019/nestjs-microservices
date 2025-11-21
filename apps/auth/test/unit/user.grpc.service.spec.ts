import { Test, TestingModule } from '@nestjs/testing';
import { UserGrpcService } from 'src/modules/user/services/user.grpc.service';
import { UserAuthService } from 'src/modules/user/services/user.auth.service';
import { Role } from '@prisma/client';

describe('UserGrpcService', () => {
    let service: UserGrpcService;
    let userAuthService: UserAuthService;

    const mockUserAuthService = {
        getUserProfile: jest.fn(),
        getUserProfileByEmail: jest.fn(),
    };

    const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: '1234567890',
        avatar: 'avatar.jpg',
        isVerified: true,
        role: Role.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserGrpcService,
                {
                    provide: UserAuthService,
                    useValue: mockUserAuthService,
                },
            ],
        }).compile();

        service = module.get<UserGrpcService>(UserGrpcService);
        userAuthService = module.get<UserAuthService>(UserAuthService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getUserById', () => {
        it('should return user when found', async () => {
            mockUserAuthService.getUserProfile.mockResolvedValue(mockUser);

            const result = await service.getUserById({ id: 'user-123' });

            expect(result.success).toBe(true);
            expect(result.user).toBeDefined();
            expect(result.user.id).toBe(mockUser.id);
        });

        it('should return failure when id is missing', async () => {
            const result = await service.getUserById({ id: '' });
            expect(result.success).toBe(false);
            expect(result.user).toBeNull();
        });

        it('should return failure when user not found', async () => {
            mockUserAuthService.getUserProfile.mockResolvedValue(null);
            const result = await service.getUserById({ id: 'user-123' });
            expect(result.success).toBe(false);
            expect(result.user).toBeNull();
        });

        it('should return failure when error occurs', async () => {
            mockUserAuthService.getUserProfile.mockRejectedValue(new Error('Error'));
            const result = await service.getUserById({ id: 'user-123' });
            expect(result.success).toBe(false);
            expect(result.user).toBeNull();
        });
    });

    describe('getUserByEmail', () => {
        it('should return user when found', async () => {
            mockUserAuthService.getUserProfileByEmail.mockResolvedValue(mockUser);

            const result = await service.getUserByEmail({ email: 'test@example.com' });

            expect(result.success).toBe(true);
            expect(result.user).toBeDefined();
            expect(result.user.email).toBe(mockUser.email);
        });

        it('should return failure when email is missing', async () => {
            const result = await service.getUserByEmail({ email: '' });
            expect(result.success).toBe(false);
            expect(result.user).toBeNull();
        });

        it('should return failure when user not found', async () => {
            mockUserAuthService.getUserProfileByEmail.mockResolvedValue(null);
            const result = await service.getUserByEmail({ email: 'test@example.com' });
            expect(result.success).toBe(false);
            expect(result.user).toBeNull();
        });

        it('should return failure when error occurs', async () => {
            mockUserAuthService.getUserProfileByEmail.mockRejectedValue(new Error('Error'));
            const result = await service.getUserByEmail({ email: 'test@example.com' });
            expect(result.success).toBe(false);
            expect(result.user).toBeNull();
        });
    });
});
