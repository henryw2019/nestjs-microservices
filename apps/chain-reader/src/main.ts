import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app/app.module';
import { setupSwagger } from './swagger';

async function bootstrap() {
    const expressInstance = express();
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressInstance));

    const configService = app.get(ConfigService);
    const logger = app.get(Logger);
    const expressApp = app.getHttpAdapter().getInstance();

    const appName = configService.get<string>('app.name');
    const env = configService.get<string>('app.env');
    const port = configService.get<number>('app.http.port');
    const host = configService.get<string>('app.http.host');

    app.enableCors(configService.get('app.cors'));

    app.use(helmet({ contentSecurityPolicy: env === 'production' ? undefined : false }));

    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: true,
        }),
    );

    if (configService.get<boolean>('app.versioning.enable')) {
        app.enableVersioning({
            type: VersioningType.URI,
            defaultVersion: configService.get<string>('app.versioning.version'),
            prefix: configService.get<string>('app.versioning.prefix'),
        });
    }

    expressApp.get('/', (_req: Request, res: Response) => {
        res.json({
            status: 'ok',
            service: appName,
            environment: env,
        });
    });

    expressApp.get('/health', (_req: Request, res: Response) => {
        res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    if (env !== 'production') {
        await setupSwagger(app);
    }

    app.enableShutdownHooks();

    // Graceful shutdown handlers
    const gracefulShutdown = async (signal: string) => {
        logger.log(`Received ${signal}, shutting down gracefully`);
        try {
            await app.close();
            logger.log('Graceful shutdown completed');
            process.exit(0);
        } catch (error) {
            logger.error('Error during graceful shutdown', error);
            process.exit(1);
        }
    };

    process.on('SIGTERM', () => {
        void gracefulShutdown('SIGTERM');
    });

    process.on('SIGINT', () => {
        void gracefulShutdown('SIGINT');
    });

    await app.listen(port, host);

    logger.log(`🚀 ${appName} started at http://${host}:${port}`);
    if (env !== 'production') {
        logger.log(`📖 Swagger: http://${host}:${port}${configService.get<string>('doc.prefix')}`);
    }
}

bootstrap().catch(error => {
    console.error('Failed to start application:', error);
    process.exit(1);
});
