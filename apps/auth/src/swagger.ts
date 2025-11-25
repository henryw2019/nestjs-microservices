import type { INestApplication } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SwaggerCustomOptions } from '@nestjs/swagger';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const setupSwagger = (app: INestApplication) => {
    const configService = app.get(ConfigService);
    const logger = new Logger();

    const docName: string = configService.get<string>('doc.name') || 'API Docs';
    const docDesc: string = configService.get<string>('doc.description') || 'API Description';
    const docVersion: string = configService.get<string>('doc.version') || '1.0.0';
    const docPrefix: string = configService.get<string>('doc.prefix') || 'docs';

    const documentBuild = new DocumentBuilder()
        .setTitle(docName)
        .setDescription(docDesc)
        .setVersion(docVersion)
        .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'accessToken')
        .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'refreshToken')
        .build();

    const document = SwaggerModule.createDocument(app, documentBuild, {
        deepScanRoutes: true,
    });
    const customOptions: SwaggerCustomOptions = {
        swaggerOptions: {
            docExpansion: 'none',
            persistAuthorization: true,
            displayOperationId: true,
            operationsSorter: 'method',
            tagsSorter: 'alpha',
            tryItOutEnabled: true,
            filter: true,
        },
    };
    SwaggerModule.setup(docPrefix, app, document, {
        explorer: true,
        customSiteTitle: docName,
        ...customOptions,
    });
    logger.log(`Docs will serve on ${docPrefix}`, 'NestApplication');
};
