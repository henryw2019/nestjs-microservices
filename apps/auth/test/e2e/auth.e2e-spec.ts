import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app/app.module';
import { DatabaseService } from '../../src/common/services/database.service';
import { RedisService } from '../../src/common/services/redis.service';
import { HashService } from '../../src/common/services/hash.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('Auth Service (e2e)', () => {
  let app: INestApplication;
  let databaseService: DatabaseService;

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
  });
});
