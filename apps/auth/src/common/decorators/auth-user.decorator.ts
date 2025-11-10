import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IAuthPayload } from 'src/modules/auth/interfaces/auth.interface';

type RequestWithUser = {
    user?: IAuthPayload;
};

type AuthUserReturn = IAuthPayload | IAuthPayload[keyof IAuthPayload] | undefined;

export const AuthUser = createParamDecorator(
    (data: keyof IAuthPayload | undefined, ctx: ExecutionContext): AuthUserReturn => {
        const request = ctx.switchToHttp().getRequest<RequestWithUser>();
        const user = request.user;

        if (data === undefined) {
            return user;
        }

        return user?.[data];
    },
);
