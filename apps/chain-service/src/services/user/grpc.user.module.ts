import { Module } from '@nestjs/common';
import { GrpcUserService } from './grpc.user.service';
import { GrpcModule } from 'nestjs-grpc';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';

@Module({
    imports: [
        ConfigModule,
        GrpcModule.forConsumerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                package: 'user',
                protoPath: join(__dirname, '../../protos/user.proto'),
                url: configService.get<string>('grpc.authUrl', '0.0.0.0:50051'),
                serviceName: 'UserService',
            }),
            inject: [ConfigService],
            providers: [GrpcUserService],
        }),
    ],
    providers: [GrpcUserService],
    exports: [GrpcUserService],
})
export class GrpcUserModule {}
