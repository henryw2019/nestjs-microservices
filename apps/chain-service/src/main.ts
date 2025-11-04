import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Request, Response } from 'express';
import helmet from 'helmet';

import { AppModule } from './app/app.module';
import { setupSwagger } from './swagger';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    const configService = app.get(ConfigService);
    const logger = app.get(Logger);
    const expressApp = app.getHttpAdapter().getInstance();

    // Basic configuration
    const appName = configService.getOrThrow<string>('app.name');
    const env = configService.getOrThrow<string>('app.env');
    const port = configService.getOrThrow<number>('app.http.port');
    const host = configService.getOrThrow<string>('app.http.host');

    // CORS
    app.enableCors({
        origin: configService.get<string[]>('app.cors.origins', ['http://localhost:3000']),
        credentials: true,
    });

    // Security
    app.use(helmet({ contentSecurityPolicy: env === 'production' ? undefined : false }));

    // Validation
    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: true,
        }),
    );

    // API versioning
    if (configService.get<boolean>('app.versioning.enable')) {
        app.enableVersioning({
            type: VersioningType.URI,
            defaultVersion: configService.get<string>('app.versioning.version'),
            prefix: configService.get<string>('app.versioning.prefix'),
        });
    }

    // Basic health check
    expressApp.get('/', (_req: Request, res: Response) => {
        res.json({
            status: 'ok',
            message: `Hello from ${appName}`,
            environment: env,
        });
    });

    expressApp.get('/health', (_req: Request, res: Response) => {
        res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // Swagger for development
    if (env !== 'production') {
        setupSwagger(app);
    }

    // Graceful shutdown
    app.enableShutdownHooks();

    process.on('SIGTERM', () => {
        logger.log('Received SIGTERM, shutting down gracefully');
        app.close();
    });

    process.on('SIGINT', () => {
        logger.log('Received SIGINT, shutting down gracefully');
        app.close();
    });

    // Start server
    await app.listen(port, host);

    logger.log(`🚀 ${appName} started at http://${host}:${port}`);

    if (env !== 'production') {
        logger.log(`📖 Swagger: http://${host}:${port}/docs`);
    }
}

bootstrap().catch(err => {
    console.error('Failed to start application:', err);
    process.exit(1);
});
