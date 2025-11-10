import { CacheInterceptor } from '@nestjs/cache-manager';
import { ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class HttpCacheInterceptor extends CacheInterceptor {
    protected isRequestCacheable(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        if (!request || request.method !== 'GET') {
            return false;
        }

        const rawUrl = request.path ?? request.originalUrl ?? request.url ?? '';
        const normalized = rawUrl.split('?')[0]?.toLowerCase();

        if (normalized === '/health' || normalized?.endsWith('/health')) {
            return false;
        }

        return true;
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
