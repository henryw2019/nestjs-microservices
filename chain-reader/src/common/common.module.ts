import { join } from 'path';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AcceptLanguageResolver, I18nModule, QueryResolver } from 'nestjs-i18n';
import { createKeyv, Keyv } from '@keyv/redis';
import { CacheableMemory } from 'cacheable';
import Joi from 'joi';

import configs from './config';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { ResponseExceptionFilter } from './filters/exception.filter';
import { RequestMiddleware } from './middlewares/request.middleware';
import { DatabaseService } from './services/database.service';
import { QueryBuilderService } from './services/query-builder.service';
import { HttpCacheInterceptor } from './interceptors/cache.interceptor';

@Module({
    imports: [
        ConfigModule.forRoot({
            load: configs,
            isGlobal: true,
            cache: true,
            envFilePath: ['.env.docker', '.env'],
            expandVariables: true,
            validationSchema: Joi.object({
                NODE_ENV: Joi.string()
                    .valid('development', 'staging', 'production', 'local')
                    .default('development'),
                APP_NAME: Joi.string().default('Chain Reader Service'),
                APP_DEBUG: Joi.boolean().truthy('true').falsy('false').default(false),
                APP_CORS_ORIGINS: Joi.string().default('*'),

                HTTP_ENABLE: Joi.boolean().truthy('true').falsy('false').default(true),
                HTTP_HOST: Joi.string().default('0.0.0.0'),
                HTTP_PORT: Joi.number().port().default(9004),
                HTTP_VERSIONING_ENABLE: Joi.boolean().truthy('true').falsy('false').default(true),
                HTTP_VERSION: Joi.number().valid(1, 2).default(1),

                DOC_PREFIX: Joi.string().default('/docs'),
                API_VERSION: Joi.string().default('1.0.0'),

                DATABASE_URL: Joi.string().uri().required(),

                CACHE_TTL_SECONDS: Joi.number().min(1).default(300),
                CACHE_MAX_ITEMS: Joi.number().min(100).default(5000),

                REDIS_URL: Joi.string().uri().optional(),
                REDIS_KEY_PREFIX: Joi.string().default('chain-reader:'),
            }),
        }),
        CacheModule.registerAsync({
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => {
                const ttlMs = configService.get<number>('cache.ttlSeconds', 300) * 1000;
                const maxItems = configService.get<number>('cache.maxItems', 5000);
                const redisUrl = configService.get<string>('redis.url', '');
                const redisKeyPrefix = configService.get<string>('redis.keyPrefix', 'chain-reader:');

                const stores = [
                    new Keyv({
                        store: new CacheableMemory({
                            ttl: ttlMs,
                            lruSize: maxItems,
                        }),
                    }),
                ];

                if (redisUrl) {
                    const namespace = redisKeyPrefix?.trim()?.length ? redisKeyPrefix : 'chain-reader:';
                    stores.push(createKeyv(redisUrl, { namespace, keyPrefixSeparator: '' }));
                }

                return {
                    stores,
                };
            },
            isGlobal: true,
        }),
        I18nModule.forRoot({
            fallbackLanguage: 'en',
            loaderOptions: {
                path: join(__dirname, '../languages/'),
                watch: process.env.NODE_ENV === 'development',
            },
            resolvers: [{ use: QueryResolver, options: ['lang'] }, AcceptLanguageResolver],
        }),
    ],
    providers: [
        DatabaseService,
        QueryBuilderService,
        {
            provide: APP_INTERCEPTOR,
            useClass: ResponseInterceptor,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: HttpCacheInterceptor,
        },
        {
            provide: APP_FILTER,
            useClass: ResponseExceptionFilter,
        },
    ],
    exports: [DatabaseService, QueryBuilderService],
})
export class CommonModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer.apply(RequestMiddleware).forRoutes('*');
    }
}
