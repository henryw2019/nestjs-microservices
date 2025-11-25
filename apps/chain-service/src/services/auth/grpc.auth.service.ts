import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ValidateTokenRequest, ValidateTokenResponse } from '../../generated/auth';

interface AuthServiceClient {
    ValidateToken(data: ValidateTokenRequest): any;
}

@Injectable()
export class GrpcAuthService implements OnModuleInit {
    private readonly logger = new Logger(GrpcAuthService.name);
    private svc!: AuthServiceClient;

    constructor(@Inject('AUTH_GRPC') private readonly client: ClientGrpc) {}

    onModuleInit() {
        this.svc = this.client.getService<AuthServiceClient>('AuthService');
    }

    async validateToken(token: string): Promise<ValidateTokenResponse> {
        try {
            this.logger.debug(`Validating token via gRPC: ${token}...`);

            const request: ValidateTokenRequest = { token };

            const response = await firstValueFrom<ValidateTokenResponse>(
                this.svc.ValidateToken(request),
            );

            this.logger.debug(`Token validation response: ${JSON.stringify(response)}`);
            return response;
        } catch (error) {
            this.logger.error(
                `Token validation failed: ${(error as Error).message}`,
                (error as Error).stack,
            );
            throw error;
        }
    }
}
