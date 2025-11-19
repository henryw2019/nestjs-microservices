import { GrpcMethod } from '@nestjs/microservices';
import { Controller } from '@nestjs/common';
import { GetUserByIdRequest, GetUserByIdResponse, GetUserByEmailRequest, GetUserByEmailResponse } from 'src/generated/user';
import { UserGrpcService } from 'src/modules/user/services/user.grpc.service';

@Controller()
export class UserGrpcController {
    constructor(private readonly userGrpcService: UserGrpcService) {}

    @GrpcMethod('UserService', 'GetUserById')
    async getUserById(data: GetUserByIdRequest): Promise<GetUserByIdResponse> {
        return await this.userGrpcService.getUserById(data);
    }

    @GrpcMethod('UserService', 'GetUserByEmail')
    async getUserByEmail(data: GetUserByEmailRequest): Promise<GetUserByEmailResponse> {
        return await this.userGrpcService.getUserByEmail(data);
    }
}
