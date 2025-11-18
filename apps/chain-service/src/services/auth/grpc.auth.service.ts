import { Injectable, Logger } from '@nestjs/common';
import { GrpcClientService } from 'nestjs-grpc';
import { ValidateTokenRequest, ValidateTokenResponse } from '../../generated/auth';

@Injectable()
export class GrpcAuthService {
    private readonly logger = new Logger(GrpcAuthService.name);

    constructor(private readonly grpcClientService: GrpcClientService) {}

    async validateToken(token: string): Promise<ValidateTokenResponse> {
        try {
            this.logger.debug(`Validating token via gRPC: ${token}...`);

            const request: ValidateTokenRequest = { token };

            const response = await this.grpcClientService.call<
                ValidateTokenRequest,
                ValidateTokenResponse
            >('AuthService', 'ValidateToken', request);

            this.logger.debug(`Token validation response: ${JSON.stringify(response)}`);
            return response;
        } catch (error) {
            this.logger.error(`Token validation failed: ${error.message}`, error.stack);
            throw error;
        }
    }
}
