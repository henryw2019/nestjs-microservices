import { Role } from '@repo/database/auth';

export interface IAuthUserPayload {
    id: string;
    role: Role;
}

export interface IRequestWithUser extends Request {
    user: IAuthUserPayload;
    requestId?: string;
    correlationId?: string;
}
