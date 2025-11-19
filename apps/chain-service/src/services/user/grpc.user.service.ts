import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { GetUserByIdRequest, GetUserByIdResponse, GetUserByEmailRequest, GetUserByEmailResponse } from '../../generated/user';

interface UserServiceClient {
    GetUserById(data: GetUserByIdRequest): any;
    GetUserByEmail(data: GetUserByEmailRequest): any;
}

@Injectable()
export class GrpcUserService implements OnModuleInit {
    private readonly logger = new Logger(GrpcUserService.name);
    private svc!: UserServiceClient;

    constructor(@Inject('USER_GRPC') private readonly client: ClientGrpc) {}

    onModuleInit() {
        this.svc = this.client.getService<UserServiceClient>('UserService');
    }

    async getUserById(userId: string): Promise<GetUserByIdResponse> {
        try {
            this.logger.debug(`Getting user by ID via gRPC: ${userId}`);

            const request: GetUserByIdRequest = { id: userId };
            const response = await firstValueFrom<GetUserByIdResponse>(
                this.svc.GetUserById(request),
            );

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
            const response = await firstValueFrom<GetUserByEmailResponse>(
                this.svc.GetUserByEmail(request),
            );

            this.logger.debug(`Get user by email response: ${JSON.stringify(response)}`);
            return response;
        } catch (error) {
            this.logger.error(`Get user by email failed: ${error.message}`, error.stack);
            throw error;
        }
    }
}
