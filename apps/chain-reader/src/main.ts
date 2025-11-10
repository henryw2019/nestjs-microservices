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

    expressApp.get('/health', async (_req: Request, res: Response) => {
        res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    if (env !== 'production') {
        await setupSwagger(app);
    }

    app.enableShutdownHooks();

    process.on('SIGTERM', () => {
        logger.log('Received SIGTERM, shutting down gracefully');
        app.close();
    });

    process.on('SIGINT', () => {
        logger.log('Received SIGINT, shutting down gracefully');
        app.close();
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
