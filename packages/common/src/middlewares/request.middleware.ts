import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { REQUEST_ID_HEADER, CORRELATION_ID_HEADER } from '../constants/request.constant';

@Injectable()
export class RequestMiddleware implements NestMiddleware {
    private readonly logger = new Logger('HTTP');

    use(request: Request, response: Response, next: NextFunction): void {
        const { method, originalUrl, ip } = request;
        const userAgent = request.get('user-agent') || 'Unknown';
        const startTime = Date.now();
        const requestId = this.generateRequestId();

        request['requestId'] = requestId;
        response.setHeader(REQUEST_ID_HEADER, requestId);
        if (!request.get(CORRELATION_ID_HEADER)) {
            response.setHeader(CORRELATION_ID_HEADER, requestId);
        }

        this.logger.log(`→ ${method} ${originalUrl} - ${ip} ${userAgent} [${requestId}]`);

        response.on('finish', () => {
            const { statusCode } = response;
            const contentLength = response.get('content-length') || 0;
            const responseTime = Date.now() - startTime;
            const statusIcon = this.getStatusIcon(statusCode);
            const logLevel = statusCode >= 400 ? 'warn' : 'log';

            this.logger[logLevel](
                `${statusIcon} ${method} ${originalUrl} ${statusCode} ${contentLength}b - ${responseTime}ms [${requestId}]`,
            );
        });

        response.on('error', error => {
            this.logger.error(`✖ ${method} ${originalUrl} - Request failed [${requestId}]`, error);
        });

        next();
    }

    private generateRequestId(): string {
        return (
            Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15)
        );
    }

    private getStatusIcon(statusCode: number): string {
        if (statusCode >= 200 && statusCode < 300) return '✓';
        if (statusCode >= 300 && statusCode < 400) return '→';
        if (statusCode >= 400 && statusCode < 500) return '⚠';
        if (statusCode >= 500) return '✖';
        return '?';
    }
}
