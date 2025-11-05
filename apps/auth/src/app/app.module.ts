import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { CommonModule } from 'src/common/common.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { UserModule } from 'src/modules/user/user.module';

import { AppController } from './app.controller';
import { GrpcModule } from 'nestjs-grpc';
import { ConfigService } from '@nestjs/config';
import { AUTH_PROTO_PACKAGE, AUTH_PROTO_PATH } from '@project/proto';
import { AuthGrpcController } from './auth.grpc.controller';

@Module({
    imports: [
        TerminusModule,
        CommonModule,
        UserModule,
        AuthModule,
        GrpcModule.forProviderAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                protoPath: AUTH_PROTO_PATH,
                package: configService.get<string>('grpc.package', AUTH_PROTO_PACKAGE),
                url: configService.get<string>('grpc.url', '0.0.0.0:50051'),
                logging: {
                    enabled: true,
                    level: configService.get<string>('app.env') === 'development' ? 'debug' : 'log',
                    context: 'AuthService',
                    logErrors: true,
                    logPerformance: configService.get<string>('app.env') === 'development',
                    logDetails: configService.get<string>('app.env') === 'development',
                },
            }),
        }),
    ],
    controllers: [AppController, AuthGrpcController],
})
export class AppModule {}
