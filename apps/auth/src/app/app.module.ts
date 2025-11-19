import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { CommonModule } from 'src/common/common.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { UserModule } from 'src/modules/user/user.module';

import { AppController } from './app.controller';
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
    ],
    controllers: [AppController, AuthGrpcController, UserGrpcController],
})
export class AppModule {}
