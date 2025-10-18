import { CacheInterceptor } from '@nestjs/cache-manager';
import { ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class HttpCacheInterceptor extends CacheInterceptor {
    protected isRequestCacheable(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        return request?.method === 'GET';
    }

    trackBy(context: ExecutionContext): string | undefined {
        if (!this.isRequestCacheable(context)) {
            return undefined;
        }

        const request = context.switchToHttp().getRequest();
        const queryKey = JSON.stringify({
            params: request.params,
            query: request.query,
        });

        return `${request.method}:${request.originalUrl}:${queryKey}`;
    }
}
