import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../../common/services/database.service';
import { AmlSoapClient } from './aml.soap.client';
import { AmlDecision, AmlPartyInfo, AmlScanRequestPayload, AmlScanResponsePayload } from './aml.types';
import AmlConfig, { AmlEnforcementMode } from '../../common/config/aml.config';
import { ConfigType } from '@nestjs/config';

@Injectable()
export class AmlService {
  private readonly logger = new Logger(AmlService.name);
  private readonly enforcement: AmlEnforcementMode;

  constructor(
    private readonly db: DatabaseService,
    private readonly soap: AmlSoapClient,
    @Inject(AmlConfig.KEY) amlCfg: ConfigType<typeof AmlConfig>
  ) {
    this.enforcement = amlCfg.enforcement;
  }

  async scanTransfer(input: {
    from: AmlPartyInfo;
    to: AmlPartyInfo;
    amount: string;
    tokenAddress?: string;
  }): Promise<{ decision: AmlDecision; scanId: string; correlationId?: string }>{
    const correlationId = randomUUID();

    const requestPayload: AmlScanRequestPayload = {
      correlationId,
      from: input.from,
      to: input.to,
      amount: input.amount,
      tokenAddress: input.tokenAddress,
    };

    const scan = await (this.db as any).amlScan.create({
      data: {
        fromUserId: input.from.userId,
        toUserId: input.to.userId,
        fromAddress: input.from.address,
        toAddress: input.to.address,
        requestPayload: requestPayload as any,
        status: 'PENDING',
      },
    });

    await (this.db as any).amlScanEvent.create({ data: { amlScanId: scan.id, type: 'REQUEST', payload: requestPayload as any } });

    const response = await this.soap.realtimeScan(requestPayload);

    await this.persistResponse(scan.id, response);

    return { decision: response.decision, scanId: scan.id, correlationId: response.correlationId };
  }

  async persistResponse(scanId: string, response: AmlScanResponsePayload) {
    await this.db.$transaction([
      (this.db as any).amlScan.update({
        where: { id: scanId },
        data: {
          lastResponse: response as any,
          resultCode: response.resultCode,
          correlationId: response.correlationId,
          status: this.mapDecisionToStatus(response.decision),
        },
      }),
      (this.db as any).amlScanEvent.create({ data: { amlScanId: scanId, type: 'RESPONSE', payload: response as any } }),
    ]);
  }

  private mapDecisionToStatus(decision: AmlDecision) {
    switch (decision) {
      case 'PASSED': return 'PASSED';
      case 'REVIEW': return 'REVIEW';
      case 'FAILED': return 'FAILED';
      case 'PENDING': return 'PENDING';
      default: return 'ERROR';
    }
  }

  shouldBlock(decision: AmlDecision): boolean {
    if (this.enforcement === 'log_only') return false;
    if (this.enforcement === 'block_on_review') return decision === 'FAILED' || decision === 'REVIEW';
    return decision === 'FAILED';
  }

  async linkTx(scanId: string, txHash: string) {
    await (this.db as any).amlScan.update({ where: { id: scanId }, data: { txHash } });
  }

  async pollPendingOnce(limit = 20) {
    const pending = await (this.db as any).amlScan.findMany({ where: { status: { in: ['PENDING', 'REVIEW'] }, correlationId: { not: null } }, take: limit, orderBy: { createdAt: 'asc' } });
    for (const s of pending) {
      try {
        const resp = await this.soap.queryResult(s.correlationId!);
        await this.persistResponse(s.id, resp);
      } catch (err) {
        this.logger.warn(`Polling failed for scan ${s.id}: ${ (err as any)?.message || err }`);
      }
    }
  }
}
