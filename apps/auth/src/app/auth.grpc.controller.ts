import { GrpcMethod } from '@nestjs/microservices';
import { Controller } from '@nestjs/common';
import type { ValidateTokenRequest, ValidateTokenResponse } from 'src/generated/auth';
import { AuthService } from 'src/modules/auth/services/auth.service';

@Controller()
export class AuthGrpcController {
    constructor(private readonly authService: AuthService) {}

    @GrpcMethod('AuthService', 'ValidateToken')
    async validateToken(data: ValidateTokenRequest): Promise<ValidateTokenResponse> {
        if (!data.token) {
            return {
                success: false,
                payload: undefined,
            };
        }

        try {
            const response = await this.authService.verifyToken(data.token);
            return {
                success: true,
                payload: {
                    id: response.id,
                    role: response.role,
                },
            };
        } catch {
            return {
                success: false,
                payload: undefined,
            };
        }
    }
}
