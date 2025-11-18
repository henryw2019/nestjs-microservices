import { registerAs } from '@nestjs/config';
import { IAuthConfig } from '../interfaces/config.interface';

function parseDurationToSeconds(input: string | undefined, fallback: string): number {
    const value = (input && input.trim().length > 0 ? input.trim() : fallback).toLowerCase();
    const match = /^([0-9]+)([smhdw])?$/.exec(value);
    if (!match) {
        console.warn(`Invalid time format: ${input}, using default: ${fallback}`);
        return parseDurationToSeconds(undefined, fallback);
    }
    const amount = parseInt(match[1], 10);
    const unit = match[2] || 's';
    const multipliers: Record<string, number> = {
        s: 1,
        m: 60,
        h: 3600,
        d: 86400,
        w: 604800,
    };
    return amount * multipliers[unit];
}

export default registerAs('auth', (): IAuthConfig => {
    // Validate required secrets
    const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET_KEY;
    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET_KEY;

    if (!accessTokenSecret || !refreshTokenSecret) {
        throw new Error(
            'JWT secrets are required. Please set ACCESS_TOKEN_SECRET_KEY and REFRESH_TOKEN_SECRET_KEY',
        );
    }

    if (accessTokenSecret.length < 32 || refreshTokenSecret.length < 32) {
        console.warn('JWT secrets should be at least 32 characters long for security');
    }

    return {
        accessToken: {
            secret: accessTokenSecret,
            expirationTime: parseDurationToSeconds(process.env.ACCESS_TOKEN_EXPIRED, '15m'),
        },
        refreshToken: {
            secret: refreshTokenSecret,
            expirationTime: parseDurationToSeconds(process.env.REFRESH_TOKEN_EXPIRED, '7d'),
        },
    };
});
