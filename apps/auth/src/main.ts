import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Request, Response } from 'express';
import helmet from 'helmet';

import { AppModule } from './app/app.module';
import { Transport } from '@nestjs/microservices';
import { join } from 'path';
import { existsSync } from 'fs';
import { setupSwagger } from './swagger';

async function bootstrap() {
    const expressInstance = express();
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressInstance));
    const configService = app.get(ConfigService);
    const logger = app.get(Logger);
    const expressApp = app.getHttpAdapter().getInstance();

    const resolveProtoPath = (file: string) => {
        const candidates = [
            join(__dirname, 'protos', file),
            join(__dirname, '..', 'protos', file),
            join(process.cwd(), 'apps/auth/src/protos', file),
        ];
        for (const p of candidates) if (existsSync(p)) return p;
        return candidates[0];
    };

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

    // Security - use helmet with compatible options
    app.use(
        helmet({
            contentSecurityPolicy: env === 'production' ? undefined : false,
            crossOriginEmbedderPolicy: false, // Disable COEP for compatibility
        }),
    );

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

    // Swagger for development
    if (env !== 'production') {
        setupSwagger(app);
    }

    // Graceful shutdown
    app.enableShutdownHooks();

    // gRPC microservice
    app.connectMicroservice({
        transport: Transport.GRPC,
        options: {
            url: configService.get<string>('grpc.url', '0.0.0.0:50051'),
            package: ['auth', 'user'],
            protoPath: [resolveProtoPath('auth.proto'), resolveProtoPath('user.proto')],
            loader: { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true },
            maxSendMessageLength: 10 * 1024 * 1024,
            maxReceiveMessageLength: 10 * 1024 * 1024,
        },
    });

    await app.startAllMicroservices();

    // Start server
    await app.listen(port, host);
    logger.log(`🚀 ${appName} started at http://${host}:${port}`);
    logger.log(`🔌 gRPC server started at ${configService.get<string>('grpc.url')}`);

    if (env !== 'production') {
        logger.log(`📖 Swagger: http://${host}:${port}/docs`);
    }
}

bootstrap().catch(err => {
    console.error('Failed to start application:', err);
    process.exit(1);
});
