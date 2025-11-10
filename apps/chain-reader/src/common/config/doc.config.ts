import { registerAs } from '@nestjs/config';
import { IDocConfig } from '../interfaces/config.interface';

export default registerAs(
    'doc',
    (): IDocConfig => ({
        name: `${process.env.APP_NAME || 'Chain Reader Service'} API Documentation`,
        description: `Read-only APIs for on-chain data access provided by ${
            process.env.APP_NAME || 'Chain Reader Service'
        }`,
        version: process.env.API_VERSION || '1.0.0',
        prefix: process.env.DOC_PREFIX || '/docs',
    }),
);
