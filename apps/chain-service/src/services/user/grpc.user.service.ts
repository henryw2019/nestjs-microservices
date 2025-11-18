import { Injectable, Logger } from '@nestjs/common';
import { GrpcClientService } from 'nestjs-grpc';
import { GetUserByIdRequest, GetUserByIdResponse, GetUserByEmailRequest, GetUserByEmailResponse } from '../../generated/user';

@Injectable()
export class GrpcUserService {
    private readonly logger = new Logger(GrpcUserService.name);

    constructor(private readonly grpcClientService: GrpcClientService) {}

    async getUserById(userId: string): Promise<GetUserByIdResponse> {
        try {
            this.logger.debug(`Getting user by ID via gRPC: ${userId}`);

            const request: GetUserByIdRequest = { id: userId };
            const response = await this.grpcClientService.call<
                GetUserByIdRequest,
                GetUserByIdResponse
            >('UserService', 'GetUserById', request);

            this.logger.debug(`Get user response: ${JSON.stringify(response)}`);
            return response;
        } catch (error) {
            this.logger.error(`Get user by ID failed: ${error.message}`, error.stack);
            throw error;
        }
    }

    async getUserByEmail(email: string): Promise<GetUserByEmailResponse> {
        try {
            this.logger.debug(`Getting user by email via gRPC: ${email}`);

            const request: GetUserByEmailRequest = { email };
            const response = await this.grpcClientService.call<
                GetUserByEmailRequest,
                GetUserByEmailResponse
            >('UserService', 'GetUserByEmail', request);

            this.logger.debug(`Get user by email response: ${JSON.stringify(response)}`);
            return response;
        } catch (error) {
            this.logger.error(`Get user by email failed: ${error.message}`, error.stack);
            throw error;
        }
    }
}
