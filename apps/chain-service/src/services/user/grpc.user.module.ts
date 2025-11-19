import { Module } from '@nestjs/common';
import { GrpcUserService } from './grpc.user.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { existsSync } from 'fs';

@Module({
    imports: [
        ConfigModule,
            ClientsModule.registerAsync([
                {
                    name: 'USER_GRPC',
                    imports: [ConfigModule],
                    inject: [ConfigService],
                    useFactory: (configService: ConfigService) => {
                        const resolveProtoPath = (file: string) => {
                            const candidates = [
                                join(__dirname, '../../protos', file),
                                join(__dirname, '../../../protos', file),
                                join(process.cwd(), 'apps/chain-service/src/protos', file),
                                join(process.cwd(), 'apps/auth/src/protos', file),
                            ];
                            for (const p of candidates) if (existsSync(p)) return p;
                            return candidates[0];
                        };
                        return {
                            transport: Transport.GRPC,
                            options: {
                                package: 'user',
                                protoPath: resolveProtoPath('user.proto'),
                                url:
                                    configService.get<string>('grpc.userUrl') ||
                                    configService.get<string>('grpc.authUrl', 'auth-service:50051'),
                                loader: { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true },
                            },
                        };
                    },
                },
            ]),
    ],
    providers: [GrpcUserService],
    exports: [GrpcUserService],
})
export class GrpcUserModule {}
