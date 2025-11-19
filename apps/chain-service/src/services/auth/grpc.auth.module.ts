import { Module } from '@nestjs/common';
import { GrpcAuthService } from './grpc.auth.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { existsSync } from 'fs';

@Module({
    imports: [
        ConfigModule,
        ClientsModule.registerAsync([
            {
                name: 'AUTH_GRPC',
                imports: [ConfigModule],
                inject: [ConfigService],
                useFactory: (configService: ConfigService) => {
                    const resolveProtoPath = (file: string) => {
                        const candidates = [
                            join(__dirname, '../../protos', file), // dist/src/protos
                            join(__dirname, '../../../protos', file), // dist/protos
                            join(process.cwd(), 'apps/chain-service/src/protos', file), // dev
                            join(process.cwd(), 'apps/auth/src/protos', file), // fallback
                        ];
                        for (const p of candidates) if (existsSync(p)) return p;
                        return candidates[0];
                    };
                    return {
                        transport: Transport.GRPC,
                        options: {
                            package: configService.get<string>('grpc.authPackage', 'auth'),
                            protoPath: resolveProtoPath('auth.proto'),
                            url: configService.get<string>('grpc.authUrl', 'auth-service:50051'),
                            loader: { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true },
                        },
                    };
                },
            },
        ]),
    ],
    providers: [GrpcAuthService],
    exports: [GrpcAuthService],
})
export class GrpcAuthModule {}
