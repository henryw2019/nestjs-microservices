import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../../common/services/database.service';
import { OfflineTransactionStatus } from '@repo/database/chain-service';

@Injectable()
export class OfflineTransactionScheduler {
    private readonly logger = new Logger(OfflineTransactionScheduler.name);

    constructor(private readonly database: DatabaseService) {}

    @Cron(CronExpression.EVERY_5_MINUTES)
    async cleanupExpiredTransactions() {
        this.logger.log('Running cleanup for expired offline transactions...');

        try {
            const result = await this.database.offlineTransaction.updateMany({
                where: {
                    status: OfflineTransactionStatus.CREATED,
                    expiresAt: {
                        lt: new Date(),
                    },
                },
                data: {
                    status: OfflineTransactionStatus.EXPIRED,
                },
            });

            if (result.count > 0) {
                this.logger.log(`Expired ${result.count} offline transactions.`);
            }
        } catch (error) {
            this.logger.error('Failed to cleanup expired transactions', error);
        }
    }
}
