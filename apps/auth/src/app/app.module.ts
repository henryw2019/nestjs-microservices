import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { CommonModule } from 'src/common/common.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { UserModule } from 'src/modules/user/user.module';

import { AppController } from './app.controller';
import { GrpcModule } from 'nestjs-grpc';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { AuthGrpcController } from './auth.grpc.controller';
import { UserGrpcController } from './user.grpc.controller';
import {existsSync} from "fs";

function resolveProtoPath(file: string) {
  const candidates = [
    join(__dirname, '../protos', file),      // dist/src/protos
    join(__dirname, '../../protos', file),   // dist/protos
    join(process.cwd(), 'apps/auth/src/protos', file), // dev 源码
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return candidates[0];
}


@Module({
    imports: [
        TerminusModule,
        CommonModule,
        UserModule,
        AuthModule,
        GrpcModule.forProviderAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                protoPaths : [resolveProtoPath('auth.proto'), resolveProtoPath('user.proto')],
                package: ['auth', 'user'],
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
    controllers: [AppController, AuthGrpcController, UserGrpcController],
})
export class AppModule {}
