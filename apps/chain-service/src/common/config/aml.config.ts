import { registerAs } from '@nestjs/config';

export type AmlEnforcementMode = 'block_on_fail' | 'block_on_review' | 'log_only';
export type AmlDelegationType = 'soap' | 'cloud_agent';

export default registerAs('aml', () => ({
  // Delegation type: 'soap' for traditional SOAP service, 'cloud_agent' for AI-powered cloud service
  delegationType: (process.env.AML_DELEGATION_TYPE as AmlDelegationType) || 'soap',
  
  // SOAP configuration (used when delegationType = 'soap')
  wsdlUrl: process.env.AML_WSDL_URL || '',
  endpoint: process.env.AML_ENDPOINT || '',
  username: process.env.AML_USERNAME || '',
  password: process.env.AML_PASSWORD || '',
  
  // Cloud Agent configuration (used when delegationType = 'cloud_agent')
  cloudAgentUrl: process.env.AML_CLOUD_AGENT_URL || '',
  cloudAgentApiKey: process.env.AML_CLOUD_AGENT_API_KEY || '',
  
  // Common configuration
  timeoutMs: parseInt(process.env.AML_TIMEOUT_MS || '15000', 10),
  retry: {
    attempts: parseInt(process.env.AML_RETRY_ATTEMPTS || '2', 10),
    delayMs: parseInt(process.env.AML_RETRY_DELAY_MS || '500', 10),
  },
  enforcement: (process.env.AML_ENFORCEMENT_MODE as AmlEnforcementMode) || 'block_on_fail',
}));
