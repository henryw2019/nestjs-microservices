import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import AmlConfig from '../../common/config/aml.config';
import { AmlDecision, AmlScanRequestPayload, AmlScanResponsePayload } from './aml.types';
import { Client, createClientAsync, ISoapMethod } from 'soap';

@Injectable()
export class AmlSoapClient {
  private readonly logger = new Logger(AmlSoapClient.name);
  private client?: Client;

  constructor(@Inject(AmlConfig.KEY) private readonly amlCfg: ConfigType<typeof AmlConfig>) {}

  private async getClient(): Promise<Client> {
    if (this.client) return this.client;
    const { wsdlUrl, endpoint, timeoutMs, username, password } = this.amlCfg;
    const client = await createClientAsync(wsdlUrl, { endpoint, wsdl_headers: {}, wsdl_options: { timeout: timeoutMs } });
    if (username || password) {
      client.setSecurity(new (require('soap').BasicAuthSecurity)(username, password));
    }
    this.client = client;
    return client;
  }

  // Call realtime scan operation defined in WSDL
  async realtimeScan(payload: AmlScanRequestPayload): Promise<AmlScanResponsePayload> {
    const client = await this.getClient();
    const method: ISoapMethod | undefined = (client as any)["RealtimeScan"] || (client as any)["realtimeScan"];
    if (!method) throw new Error('SOAP method RealtimeScan not found in WSDL');

    try {
      const [result] = await (method as any + 'Async' in client ? (client as any).RealtimeScanAsync(payload) : method(payload));
      return this.normalizeScanResponse(result);
    } catch (err) {
      this.logger.error('RealtimeScan SOAP call failed', err as any);
      return { decision: 'ERROR', raw: this.serializeErr(err) };
    }
  }

  // Call result query operation defined in WSDL
  async queryResult(correlationId: string): Promise<AmlScanResponsePayload> {
    const client = await this.getClient();
    const method: ISoapMethod | undefined = (client as any)["QueryResult"] || (client as any)["queryResult"];
    if (!method) throw new Error('SOAP method QueryResult not found in WSDL');

    try {
      const args = { correlationId };
      const [result] = await (method as any + 'Async' in client ? (client as any).QueryResultAsync(args) : method(args));
      return this.normalizeScanResponse(result);
    } catch (err) {
      this.logger.error('QueryResult SOAP call failed', err as any);
      return { decision: 'ERROR', raw: this.serializeErr(err) };
    }
  }

  // Map vendor-specific response to our normalized shape
  private normalizeScanResponse(result: any): AmlScanResponsePayload {
    // NOTE: adapt this mapping to actual WSDL contract
    const decisionText: string = result?.decision || result?.status || 'PENDING';
    const decision = this.mapDecision(decisionText);
    return {
      decision,
      resultCode: result?.code || result?.resultCode,
      correlationId: result?.correlationId,
      raw: result,
    };
  }

  private mapDecision(input: string): AmlDecision {
    const v = (input || '').toUpperCase();
    if (v.includes('PASS') || v === 'CLEAR') return 'PASSED';
    if (v.includes('REVIEW') || v.includes('MANUAL')) return 'REVIEW';
    if (v.includes('FAIL') || v.includes('HIT')) return 'FAILED';
    if (v.includes('PEND')) return 'PENDING';
    return 'ERROR';
  }

  private serializeErr(err: any) {
    try { return JSON.parse(JSON.stringify(err)); } catch { return String(err); }
  }
}
