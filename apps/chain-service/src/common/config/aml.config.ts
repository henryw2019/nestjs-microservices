import { registerAs } from '@nestjs/config';

export type AmlEnforcementMode = 'block_on_fail' | 'block_on_review' | 'log_only';

export default registerAs('aml', () => ({
    wsdlUrl: process.env.AML_WSDL_URL || '',
    endpoint: process.env.AML_ENDPOINT || '',
    username: process.env.AML_USERNAME || '',
    password: process.env.AML_PASSWORD || '',
    timeoutMs: parseInt(process.env.AML_TIMEOUT_MS || '15000', 10),
    retry: {
        attempts: parseInt(process.env.AML_RETRY_ATTEMPTS || '2', 10),
        delayMs: parseInt(process.env.AML_RETRY_DELAY_MS || '500', 10),
    },
    enforcement: (process.env.AML_ENFORCEMENT_MODE as AmlEnforcementMode) || 'block_on_fail',
}));
