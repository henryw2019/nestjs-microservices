import { Module } from '@nestjs/common';
import { GrpcAuthService } from './grpc.auth.service';
import { GrpcModule } from 'nestjs-grpc';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AUTH_PROTO_PATH, AUTH_PROTO_SERVICE, AUTH_PROTO_PACKAGE } from '@project/proto';

@Module({
    imports: [
        ConfigModule,
        GrpcModule.forConsumerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                package: configService.get<string>('grpc.authPackage', AUTH_PROTO_PACKAGE),
                protoPath: AUTH_PROTO_PATH,
                url: configService.get<string>('grpc.authUrl', '0.0.0.0:50051'),
                serviceName: AUTH_PROTO_SERVICE,
            }),
            inject: [ConfigService],
            providers: [GrpcAuthService],
        }),
    ],
    providers: [GrpcAuthService],
    exports: [GrpcAuthService],
})
export class GrpcAuthModule {}
