import { registerAs } from '@nestjs/config';
import { ICacheConfig } from '../interfaces/config.interface';

export default registerAs('cache', (): ICacheConfig => {
    const ttlSeconds = Math.max(parseInt(process.env.CACHE_TTL_SECONDS || '300', 10), 1);
    const maxItems = Math.max(parseInt(process.env.CACHE_MAX_ITEMS || '5000', 10), 100);

    return {
        ttlSeconds,
        maxItems,
    };
});
