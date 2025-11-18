import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AmlService } from './aml.service';

@Injectable()
export class AmlResultPollingService {
  private readonly logger = new Logger(AmlResultPollingService.name);
  constructor(private readonly aml: AmlService) {}

  // Poll every minute; tune as needed
  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    try {
      await this.aml.pollPendingOnce();
    } catch (err) {
      this.logger.error('AML polling job error', err as any);
    }
  }
}
