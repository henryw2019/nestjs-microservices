import { Injectable, NotFoundException } from '@nestjs/common';
import { UserAuthService } from 'src/modules/user/services/user.auth.service';
import { GetUserByIdRequest, GetUserByIdResponse, GetUserByEmailRequest, GetUserByEmailResponse, User } from 'src/generated/user';
import { UserResponseDto } from 'src/modules/user/dtos/user.response.dto';

@Injectable()
export class UserGrpcService {
    constructor(private readonly userAuthService: UserAuthService) {}

    private mapUserToGrpcUser(user: UserResponseDto): User {
        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName ?? undefined,
            lastName: user.lastName ?? undefined,
            phoneNumber: user.phoneNumber || '',
            avatar: user.avatar || '',
            isVerified: user.isVerified,
            role: user.role,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
        };
    }

    async getUserById(request: GetUserByIdRequest): Promise<GetUserByIdResponse> {
        if (!request.id) {
            return {
                success: false,
                user: undefined,
            };
        }

        try {
            const user = await this.userAuthService.getUserProfile(request.id);
            if (!user) {
                return {
                    success: false,
                    user: undefined,
                };
            }

            return {
                success: true,
                user: this.mapUserToGrpcUser(user),
            };
        } catch (error) {
            return {
                success: false,
                user: undefined,
            };
        }
    }

    async getUserByEmail(request: GetUserByEmailRequest): Promise<GetUserByEmailResponse> {
        if (!request.email) {
            return {
                success: false,
                user: undefined,
            };
        }

        try {
            const user = await this.userAuthService.getUserProfileByEmail(request.email);
            if (!user) {
                return {
                    success: false,
                    user: undefined,
                };
            }

            return {
                success: true,
                user: this.mapUserToGrpcUser(user),
            };
        } catch (error) {
            return {
                success: false,
                user: undefined,
            };
        }
    }
}
