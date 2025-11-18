import { Module } from '@nestjs/common';

import { CommonModule } from 'src/common/common.module';
import { UserAdminController } from './controllers/user.admin.controller';
import { UserAuthController } from './controllers/user.auth.controller';
import { UserAuthService } from './services/user.auth.service';
import { UserAdminService } from './services/user.admin.service';
import { UserGrpcService } from './services/user.grpc.service';

@Module({
    imports: [CommonModule],
    controllers: [UserAdminController, UserAuthController],
    providers: [UserAuthService, UserAdminService, UserGrpcService],
    exports: [UserAuthService, UserAdminService, UserGrpcService],
})
export class UserModule {}
