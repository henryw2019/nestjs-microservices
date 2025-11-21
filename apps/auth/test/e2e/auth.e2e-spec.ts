import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app/app.module';
import { DatabaseService } from '../../src/common/services/database.service';
import { RedisService } from '../../src/common/services/redis.service';
import { HashService } from '../../src/common/services/hash.service';
import { AuthService } from '../../src/modules/auth/services/auth.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
// import { Role } from '@prisma/client';

// Mock Role enum since it's not exported correctly in test environment sometimes
const Role = {
  USER: 'USER',
  ADMIN: 'ADMIN',
};

describe('Auth Service (e2e)', () => {
  let app: INestApplication;
  let databaseService: DatabaseService;
  let authService: AuthService;

  const mockDatabaseService = {
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
    isHealthy: jest.fn().mockResolvedValue({
      database: {
        status: 'up',
        connection: 'active',
        responseTime: 'normal',
      },
    }),
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockRedisService = {
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    ping: jest.fn(),
    quit: jest.fn(),
    isHealthy: jest.fn().mockResolvedValue({
      redis: {
        status: 'up',
        connection: 'active',
        responseTime: 'normal',
      },
    }),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockHashService = {
    createHash: jest.fn().mockReturnValue('hashed_password'),
    match: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue(mockDatabaseService)
      .overrideProvider(RedisService)
      .useValue(mockRedisService)
      .overrideProvider(CACHE_MANAGER)
      .useValue(mockCacheManager)
      .overrideProvider(HashService)
      .useValue(mockHashService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    databaseService = moduleFixture.get<DatabaseService>(DatabaseService);
    authService = moduleFixture.get<AuthService>(AuthService);
  });

  afterEach(async () => {
    await app.close();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200);
  });

  describe('Auth', () => {
    it('/auth/signup (POST) - success', () => {
      const signupDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      mockDatabaseService.user.findUnique.mockResolvedValue(null);
      mockDatabaseService.user.create.mockImplementation((args) => {
        // console.log('Mock create called with:', JSON.stringify(args, null, 2));
        return Promise.resolve({
          id: 'user-123',
          ...signupDto,
          password: 'hashed_password',
          role: 'USER',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      return request(app.getHttpServer())
        .post('/auth/signup')
        .send(signupDto)
        .expect(201)
        .expect((res) => {
          // console.log('Signup response body:', res.body);
          expect(res.body.data.user.email).toBe(signupDto.email);
          expect(res.body.data.accessToken).toBeDefined();
          expect(res.body.data.refreshToken).toBeDefined();
        });
    });

    it('/auth/login (POST) - success', () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockDatabaseService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: loginDto.email,
        password: 'hashed_password',
        role: 'USER',
        firstName: 'Test',
        lastName: 'User',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.data.user.email).toBe(loginDto.email);
          expect(res.body.data.accessToken).toBeDefined();
          expect(res.body.data.refreshToken).toBeDefined();
        });
    });

    it('/auth/login (POST) - invalid credentials', () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockDatabaseService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: loginDto.email,
        password: 'hashed_password',
        firstName: 'Test',
        lastName: 'User',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockHashService.match.mockReturnValueOnce(false);

      return request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(404);
    });

    it('/auth/refresh (GET) - success', async () => {
      const user = { id: 'user-123', role: Role.USER };
      const tokens = await authService.generateTokens(user);

      return request(app.getHttpServer())
        .get('/auth/refresh')
        .set('Authorization', `Bearer ${tokens.refreshToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.accessToken).toBeDefined();
          expect(res.body.data.refreshToken).toBeDefined();
        });
    });
  });

  describe('User', () => {
    let accessToken: string;
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: Role.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    beforeEach(async () => {
      const tokens = await authService.generateTokens({ id: mockUser.id, role: mockUser.role });
      accessToken = tokens.accessToken;
    });

    it('/user/profile (GET) - success', () => {
      mockDatabaseService.user.findUnique.mockResolvedValue(mockUser);

      return request(app.getHttpServer())
        .get('/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.email).toBe(mockUser.email);
          expect(res.body.data.id).toBe(mockUser.id);
        });
    });

    it('/user/profile (PUT) - success', () => {
      const updateDto = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      mockDatabaseService.user.findUnique.mockResolvedValue(mockUser);
      mockDatabaseService.user.update.mockResolvedValue({
        ...mockUser,
        ...updateDto,
      });

      return request(app.getHttpServer())
        .put('/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.firstName).toBe(updateDto.firstName);
          expect(res.body.data.lastName).toBe(updateDto.lastName);
        });
    });
  });

  describe('Admin', () => {
    let adminToken: string;
    const mockAdmin = {
      id: 'admin-123',
      email: 'admin@example.com',
      role: Role.ADMIN,
    };

    beforeEach(async () => {
      const tokens = await authService.generateTokens({ id: mockAdmin.id, role: mockAdmin.role });
      adminToken = tokens.accessToken;
    });

    it('/admin/user (GET) - success', () => {
      const mockUsers = [
        { id: 'user-1', email: 'user1@example.com', role: Role.USER },
        { id: 'user-2', email: 'user2@example.com', role: Role.USER },
      ];

      mockDatabaseService.user.findMany.mockResolvedValue(mockUsers);
      mockDatabaseService.user.count.mockResolvedValue(2);

      return request(app.getHttpServer())
        .get('/admin/user')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.items).toHaveLength(2);
          expect(res.body.data.meta.total).toBe(2);
        });
    });

    it('/admin/user/:id (DELETE) - success', () => {
      const userId = 'user-to-delete';
      mockDatabaseService.user.findUnique.mockResolvedValue({ id: userId, deletedAt: null });
      mockDatabaseService.user.update.mockResolvedValue({ id: userId, deletedAt: new Date() });

      return request(app.getHttpServer())
        .delete(`/admin/user/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('/admin/user/:id (PATCH) - success', () => {
      const userId = 'user-to-update';
      const updateDto = { firstName: 'AdminUpdated' };
      
      mockDatabaseService.user.findUnique.mockResolvedValue({ id: userId, deletedAt: null });
      mockDatabaseService.user.update.mockResolvedValue({ id: userId, ...updateDto });

      return request(app.getHttpServer())
        .patch(`/admin/user/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.firstName).toBe(updateDto.firstName);
        });
    });

    it('/admin/user (GET) - forbidden for non-admin', async () => {
      const userTokens = await authService.generateTokens({ id: 'user-123', role: Role.USER });
      
      return request(app.getHttpServer())
        .get('/admin/user')
        .set('Authorization', `Bearer ${userTokens.accessToken}`)
        .expect(403);
    });
  });
});
