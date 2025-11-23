import { Test, TestingModule } from '@nestjs/testing';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';
import { Reflector } from '@nestjs/core';
import { I18nService } from 'nestjs-i18n';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, Observable } from 'rxjs';
import { MESSAGE_KEY_METADATA, MESSAGE_DTO_METADATA } from '../../src/common/constants/response.constant';

describe('ResponseInterceptor', () => {
    let interceptor: ResponseInterceptor;
    let reflector: jest.Mocked<Reflector>;
    let i18nService: jest.Mocked<I18nService>;

    beforeEach(async () => {
        const mockReflector = {
            get: jest.fn(),
        };

        const mockI18nService = {
            translate: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ResponseInterceptor,
                {
                    provide: Reflector,
                    useValue: mockReflector,
                },
                {
                    provide: I18nService,
                    useValue: mockI18nService,
                },
            ],
        }).compile();

        interceptor = module.get<ResponseInterceptor>(ResponseInterceptor);
        reflector = module.get(Reflector) as jest.Mocked<Reflector>;
        i18nService = module.get(I18nService) as jest.Mocked<I18nService>;
    });

    const createMockContext = (statusCode: number = 200): ExecutionContext => {
        const mockResponse = {
            statusCode,
        };
        const mockContext = {
            switchToHttp: jest.fn().mockReturnValue({
                getResponse: jest.fn().mockReturnValue(mockResponse),
            }),
            getHandler: jest.fn(),
        } as unknown as ExecutionContext;
        return mockContext;
    };

    const createMockCallHandler = (data: any): CallHandler => {
        return {
            handle: jest.fn().mockReturnValue(of(data)),
        };
    };

    it('should be defined', () => {
        expect(interceptor).toBeDefined();
    });

    it('should transform response with message key and DTO', done => {
        const mockData = { id: 1, name: 'test' };
        const mockContext = createMockContext(200);
        const mockNext = createMockCallHandler(mockData);
        const mockDto = class TestDto {};

        reflector.get.mockImplementation((key) => {
            if (key === MESSAGE_KEY_METADATA) return 'test.success.message';
            if (key === MESSAGE_DTO_METADATA) return mockDto;
            return undefined;
        });

        i18nService.translate.mockResolvedValue('Success message');

        interceptor.intercept(mockContext, mockNext).subscribe(result => {
            expect(result).toEqual({
                statusCode: 200,
                timestamp: expect.any(String),
                message: 'Success message',
                data: expect.any(Object), // Transformed by plainToInstance
            });
            expect(reflector.get).toHaveBeenCalledWith(MESSAGE_KEY_METADATA, mockContext.getHandler());
            expect(reflector.get).toHaveBeenCalledWith(MESSAGE_DTO_METADATA, mockContext.getHandler());
            expect(i18nService.translate).toHaveBeenCalledWith('test.success.message', {
                defaultValue: 'http.success.200',
            });
            done();
        });
    });

    it('should transform response without message key', done => {
        const mockData = { id: 1, name: 'test' };
        const mockContext = createMockContext(201);
        const mockNext = createMockCallHandler(mockData);

        reflector.get.mockImplementation((key) => {
    if (key === MESSAGE_KEY_METADATA) return 'test.success.message';
    if (key === MESSAGE_DTO_METADATA) return class TestDto {};
    return undefined;
});

        i18nService.translate.mockResolvedValue('Created successfully');

        interceptor.intercept(mockContext, mockNext).subscribe(result => {
            expect(result).toEqual({
                statusCode: 201,
                timestamp: expect.any(String),
                message: 'Created successfully',
                data: mockData,
            });
            expect(i18nService.translate).toHaveBeenCalledWith('http.success.201');
            done();
        });
    });

    it('should handle null data', done => {
        const mockContext = createMockContext(200);
        const mockNext = createMockCallHandler(null);

        reflector.get.mockImplementation((key) => {
    if (key === MESSAGE_KEY_METADATA) return 'test.success.message';
    if (key === MESSAGE_DTO_METADATA) return class TestDto {};
    return undefined;
});

        i18nService.translate.mockResolvedValue('Success');

        interceptor.intercept(mockContext, mockNext).subscribe(result => {
            expect(result).toEqual({
                statusCode: 200,
                timestamp: expect.any(String),
                message: 'Success',
                data: null,
            });
            done();
        });
    });

    it('should use default message when translation fails', done => {
        const mockData = { test: 'data' };
        const mockContext = createMockContext(404);
        const mockNext = createMockCallHandler(mockData);

        reflector.get.mockReturnValue('nonexistent.message');

        i18nService.translate.mockResolvedValue('Not found');

        interceptor.intercept(mockContext, mockNext).subscribe(result => {
            expect(i18nService.translate).toHaveBeenCalledWith('nonexistent.message', {
                defaultValue: 'http.success.404',
            });
            expect(result.message).toBe('Not found');
            done();
        });
    });

    it('should handle different status codes correctly', done => {
        const mockData = { success: true };
        const mockContext = createMockContext(500);
        const mockNext = createMockCallHandler(mockData);

        reflector.get.mockImplementation((key) => {
    if (key === MESSAGE_KEY_METADATA) return 'test.success.message';
    if (key === MESSAGE_DTO_METADATA) return class TestDto {};
    return undefined;
});

        i18nService.translate.mockResolvedValue('Internal server error');

        interceptor.intercept(mockContext, mockNext).subscribe(result => {
            expect(result.statusCode).toBe(500);
            expect(i18nService.translate).toHaveBeenCalledWith('http.success.500');
            done();
        });
    });

    it('should not transform data when no DTO is provided', done => {
        const mockData = { id: 1, rawField: 'value' };
        const mockContext = createMockContext(200);
        const mockNext = createMockCallHandler(mockData);

        reflector.get.mockImplementation((key) => {
            if (key === MESSAGE_KEY_METADATA) return 'simple.message';
            if (key === MESSAGE_DTO_METADATA) return undefined;
            return undefined;
        });

        i18nService.translate.mockResolvedValue('Simple success');

        interceptor.intercept(mockContext, mockNext).subscribe(result => {
            expect(result.data).toEqual(mockData);
            done();
        });
    });
});