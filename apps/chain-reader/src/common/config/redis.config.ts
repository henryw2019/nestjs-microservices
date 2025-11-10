import { registerAs } from '@nestjs/config';
import { IRedisConfig } from '../interfaces/config.interface';

export default registerAs(
    'redis',
    (): IRedisConfig => ({
        url: process.env.REDIS_URL,
        keyPrefix: process.env.REDIS_KEY_PREFIX || 'chain-reader:',
    }),
);
