import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const setupSwagger = async (app: INestApplication) => {
    const configService = app.get(ConfigService);
    const logger = new Logger('Swagger');

    const docName = configService.get<string>('doc.name');
    const docDesc = configService.get<string>('doc.description');
    const docVersion = configService.get<string>('doc.version');
    const docPrefix = configService.get<string>('doc.prefix');

    const documentBuild = new DocumentBuilder()
        .setTitle(docName)
        .setDescription(docDesc)
        .setVersion(docVersion)
        .build();

    const document = SwaggerModule.createDocument(app, documentBuild, {
        deepScanRoutes: true,
    });

    SwaggerModule.setup(docPrefix, app, document, {
        explorer: true,
        customSiteTitle: docName,
        swaggerOptions: {
            docExpansion: 'none',
            persistAuthorization: true,
            displayOperationId: true,
            operationsSorter: 'method',
            tagsSorter: 'alpha',
            tryItOutEnabled: true,
            filter: true,
        },
    });

    logger.log(`Docs served at ${docPrefix}`);
};
