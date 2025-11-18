import { GrpcController, GrpcMethod } from 'nestjs-grpc';
import { GetUserByIdRequest, GetUserByIdResponse, GetUserByEmailRequest, GetUserByEmailResponse } from 'src/generated/user';
import { UserGrpcService } from 'src/modules/user/services/user.grpc.service';

@GrpcController('UserService')
export class UserGrpcController {
    constructor(private readonly userGrpcService: UserGrpcService) {}

    @GrpcMethod('GetUserById')
    async getUserById(data: GetUserByIdRequest): Promise<GetUserByIdResponse> {
        return await this.userGrpcService.getUserById(data);
    }

    @GrpcMethod('GetUserByEmail')
    async getUserByEmail(data: GetUserByEmailRequest): Promise<GetUserByEmailResponse> {
        return await this.userGrpcService.getUserByEmail(data);
    }
}
