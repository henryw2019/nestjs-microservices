import { GrpcController, GrpcMethod } from 'nestjs-grpc';
import {
    GetUserByIdRequest,
    GetUserByIdResponse,
    GetUserByEmailRequest,
    GetUserByEmailResponse,
} from 'src/generated/user';
import { UserAuthService } from 'src/modules/user/services/user.auth.service';

@GrpcController('UserService')
export class UserGrpcController {
    constructor(private readonly userAuthService: UserAuthService) {}

    @GrpcMethod('GetUserById')
    async getUserById(data: GetUserByIdRequest): Promise<GetUserByIdResponse> {
        if (!data.id) {
            return {
                success: false,
                user: null,
            };
        }

        try {
            const user = await this.userAuthService.getUserProfile(data.id);
            if (!user) {
                return {
                    success: false,
                    user: null,
                };
            }

            return {
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    phoneNumber: user.phoneNumber,
                    avatar: user.avatar,
                    isVerified: user.isVerified,
                    role: user.role,
                    createdAt: user.createdAt.toISOString(),
                    updatedAt: user.updatedAt.toISOString(),
                },
            };
        } catch {
            return {
                success: false,
                user: null,
            };
        }
    }

    @GrpcMethod('GetUserByEmail')
    async getUserByEmail(data: GetUserByEmailRequest): Promise<GetUserByEmailResponse> {
        if (!data.email) {
            return {
                success: false,
                user: null,
            };
        }

        try {
            const user = await this.userAuthService.getUserProfileByEmail(data.email);
            if (!user) {
                return {
                    success: false,
                    user: null,
                };
            }

            return {
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    phoneNumber: user.phoneNumber,
                    avatar: user.avatar,
                    isVerified: user.isVerified,
                    role: user.role,
                    createdAt: user.createdAt.toISOString(),
                    updatedAt: user.updatedAt.toISOString(),
                },
            };
        } catch {
            return {
                success: false,
                user: null,
            };
        }
    }
}
