import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/common/services/database.service';
import { ethers } from 'ethers';

@Injectable()
export class KeyStoreService {
    private readonly logger = new Logger(KeyStoreService.name);

    constructor(private readonly database: DatabaseService) {}

    async createForUser(userId: string) {
        const existing = await (this.database as any).keyStore.findFirst({ where: { userId } });
        if (existing) {
            return this.sanitize(existing);
        }

        const wallet = ethers.Wallet.createRandom();
        const record = await (this.database as any).keyStore.create({
            data: {
                userId,
                address: wallet.address,
                privateKey: wallet.privateKey,
            },
        });

        this.logger.log(`Generated keystore for user ${userId}`);
        return this.sanitize(record);
    }

    async getPublicByUserId(userId: string) {
        const rec = await (this.database as any).keyStore.findFirst({ where: { userId } });
        if (!rec) throw new NotFoundException('Keystore not found');
        return this.sanitize(rec);
    }

    async getByAddress(address: string) {
        const rec = await (this.database as any).keyStore.findFirst({ where: { address } });
        if (!rec) throw new NotFoundException('Keystore not found');
        return rec;
    }

    async getSecretByUserId(userId: string) {
        const rec = await (this.database as any).keyStore.findFirst({ where: { userId } });
        if (!rec) throw new NotFoundException('Keystore not found');
        return rec;
    }

    private sanitize(record: any) {
        return {
            id: record.id,
            userId: record.userId,
            address: record.address,
            createdAt: record.createdAt,
        };
    }
}
