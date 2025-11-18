import { Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import AmlConfig from '../../common/config/aml.config';
import { AmlDecision, AmlScanRequestPayload, AmlScanResponsePayload } from './aml.types';

/**
 * Cloud Intelligence Agent client for AML scanning.
 * Provides AI-powered anti-money laundering detection using cloud-based services.
 */
@Injectable()
export class AmlCloudAgentClient {
  private readonly logger = new Logger(AmlCloudAgentClient.name);

  constructor(private readonly amlCfg: ConfigType<typeof AmlConfig>) {}

  /**
   * Perform realtime AML scan using cloud intelligence agent
   */
  async realtimeScan(payload: AmlScanRequestPayload): Promise<AmlScanResponsePayload> {
    const { cloudAgentUrl, cloudAgentApiKey, timeoutMs } = this.amlCfg;

    if (!cloudAgentUrl) {
      this.logger.error('Cloud agent URL not configured');
      return { decision: 'ERROR', raw: { error: 'Cloud agent URL not configured' } };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(`${cloudAgentUrl}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(cloudAgentApiKey && { 'Authorization': `Bearer ${cloudAgentApiKey}` }),
        },
        body: JSON.stringify({
          correlationId: payload.correlationId,
          from: payload.from,
          to: payload.to,
          amount: payload.amount,
          tokenAddress: payload.tokenAddress,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Cloud agent scan failed: ${response.status} - ${errorText}`);
        return { 
          decision: 'ERROR', 
          raw: { 
            status: response.status, 
            error: errorText 
          } 
        };
      }

      const result = await response.json();
      return this.normalizeScanResponse(result);
    } catch (err) {
      this.logger.error('Cloud agent realtimeScan failed', err as any);
      return { 
        decision: 'ERROR', 
        raw: this.serializeErr(err) 
      };
    }
  }

  /**
   * Query scan result using correlation ID
   */
  async queryResult(correlationId: string): Promise<AmlScanResponsePayload> {
    const { cloudAgentUrl, cloudAgentApiKey, timeoutMs } = this.amlCfg;

    if (!cloudAgentUrl) {
      this.logger.error('Cloud agent URL not configured');
      return { decision: 'ERROR', raw: { error: 'Cloud agent URL not configured' } };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(`${cloudAgentUrl}/scan/${correlationId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(cloudAgentApiKey && { 'Authorization': `Bearer ${cloudAgentApiKey}` }),
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Cloud agent query failed: ${response.status} - ${errorText}`);
        return { 
          decision: 'ERROR', 
          raw: { 
            status: response.status, 
            error: errorText 
          } 
        };
      }

      const result = await response.json();
      return this.normalizeScanResponse(result);
    } catch (err) {
      this.logger.error('Cloud agent queryResult failed', err as any);
      return { 
        decision: 'ERROR', 
        raw: this.serializeErr(err) 
      };
    }
  }

  /**
   * Normalize cloud agent response to standard format
   */
  private normalizeScanResponse(result: any): AmlScanResponsePayload {
    // Cloud agent may return different field names, normalize them
    const decision = this.mapDecision(
      result?.decision || 
      result?.status || 
      result?.riskLevel || 
      'PENDING'
    );
    
    return {
      decision,
      resultCode: result?.code || result?.resultCode || result?.statusCode,
      correlationId: result?.correlationId || result?.scanId,
      raw: result,
    };
  }

  /**
   * Map various decision formats to our standard AmlDecision type
   */
  private mapDecision(input: string): AmlDecision {
    const v = (input || '').toUpperCase();
    
    // Check for passed/clear/approved states
    if (v.includes('PASS') || v === 'CLEAR' || v === 'APPROVED' || v === 'LOW_RISK') {
      return 'PASSED';
    }
    
    // Check for review/manual review states
    if (v.includes('REVIEW') || v.includes('MANUAL') || v === 'MEDIUM_RISK') {
      return 'REVIEW';
    }
    
    // Check for failed/blocked/rejected states
    if (v.includes('FAIL') || v.includes('BLOCK') || v.includes('REJECT') || v === 'HIGH_RISK') {
      return 'FAILED';
    }
    
    // Check for pending/processing states
    if (v.includes('PEND') || v.includes('PROCESS')) {
      return 'PENDING';
    }
    
    // Default to ERROR for unknown states
    return 'ERROR';
  }

  /**
   * Serialize error for logging
   */
  private serializeErr(err: any) {
    try {
      if (err instanceof Error) {
        return {
          name: err.name,
          message: err.message,
          stack: err.stack,
        };
      }
      return JSON.parse(JSON.stringify(err));
    } catch {
      return String(err);
    }
  }
}
