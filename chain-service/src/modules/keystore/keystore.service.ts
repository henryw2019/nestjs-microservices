import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/common/services/database.service';
import { Wallet, getAddress } from 'ethers';

@Injectable()
export class KeyStoreService {
    private readonly logger = new Logger(KeyStoreService.name);

    constructor(private readonly database: DatabaseService) {}

    async createForUser(userId: string, accountName?: string) {
        const wallet = Wallet.createRandom();
        const normalizedAddress = getAddress(wallet.address);
        const record = await (this.database as any).keyStore.create({
            data: {
                userId,
                address: normalizedAddress,
                privateKey: wallet.privateKey,
                accountName: accountName || null,
            },
        });

        this.logger.log(`Generated keystore for user ${userId} with address ${normalizedAddress}`);
        return this.sanitize(record);
    }

    async getPublicByUserId(userId: string) {
        const records = await (this.database as any).keyStore.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' },
        });

        if (!records.length) throw new NotFoundException('Keystore not found');
        return records.map((record: any) => this.sanitize(record));
    }

    async getByAddress(address: string) {
        const normalizedAddress = getAddress(address);
        const rec = await (this.database as any).keyStore.findFirst({ where: { address: normalizedAddress } });
        if (!rec) throw new NotFoundException('Keystore not found');
        return rec;
    }

    async getSecretByUserId(userId: string) {
        const rec = await (this.database as any).keyStore.findFirst({
            where: { userId },
            orderBy: { createdAt: 'asc' },
        });
        if (!rec) throw new NotFoundException('Keystore not found');
        return rec;
    }

    async getSecretByUserIdAndAddress(userId: string, address: string) {
        const normalizedAddress = getAddress(address);
        const rec = await (this.database as any).keyStore.findFirst({
            where: {
                userId,
                address: normalizedAddress,
            },
        });
        if (!rec) throw new NotFoundException('Keystore not found for the provided address');
        return rec;
    }

    private sanitize(record: any) {
        return {
            id: record.id,
            userId: record.userId,
            address: record.address,
            accountName: record.accountName || undefined,
            createdAt: record.createdAt,
        };
    }
}
