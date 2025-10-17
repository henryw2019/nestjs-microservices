import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { DatabaseService } from '@/common/services/database.service';
import {
    AddressBalanceQueryDto,
    BlockQueryDto,
    Erc20TransferQueryDto,
    EventLogQueryDto,
    TokenMetaQueryDto,
    TransactionQueryDto,
} from '../dtos/chain-indexer-query.dto';
import { CheckpointQueryDto } from '../dtos/checkpoint-query.dto';

type SerializedEntity = Record<string, unknown>;

@Injectable()
export class ChainIndexerService {
    constructor(private readonly database: DatabaseService) {}

    async getBlocks(query: BlockQueryDto): Promise<SerializedEntity[]> {
        const blockNumber = query.number;
        const hash = this.sanitize(query.hash);

        if (blockNumber === undefined && !hash) {
            throw new BadRequestException('Provide block number or hash to query blocks.');
        }

        const where: Prisma.BlockWhereInput = {};
        if (blockNumber !== undefined) {
            where.number = this.toBigInt(blockNumber);
        }
        if (hash) {
            where.hash = this.equalsInsensitive(hash);
        }

        const blocks = await this.database.block.findMany({
            where,
            orderBy: { number: 'desc' },
        });

        return this.serializeMany(blocks);
    }

    async getTransactions(query: TransactionQueryDto): Promise<SerializedEntity[]> {
        const hash = this.sanitize(query.hash);
        const from = this.sanitize(query.from);
        const to = this.sanitize(query.to);

        if (!hash && !from && !to) {
            throw new BadRequestException('Provide hash, from, or to to query transactions.');
        }

        const where: Prisma.TxWhereInput = {};
        if (hash) {
            where.hash = this.equalsInsensitive(hash);
        }
        if (from) {
            where.from = this.equalsInsensitive(from);
        }
        if (to) {
            where.to = this.equalsInsensitive(to);
        }

        const transactions = await this.database.tx.findMany({
            where,
            orderBy: { blockNumber: 'desc' },
        });

        return this.serializeMany(transactions);
    }

    async getErc20Transfers(query: Erc20TransferQueryDto): Promise<SerializedEntity[]> {
        const txHash = this.sanitize(query.txHash);
        const token = this.sanitize(query.token);
        const from = this.sanitize(query.from);
        const to = this.sanitize(query.to);

        if (!txHash && !token && !from && !to) {
            throw new BadRequestException('Provide txHash, token, from, or to to query ERC20 transfers.');
        }

        const where: Prisma.ERC20TransferWhereInput = {};
        if (txHash) {
            where.txHash = this.equalsInsensitive(txHash);
        }
        if (token) {
            where.token = this.equalsInsensitive(token);
        }
        if (from) {
            where.from = this.equalsInsensitive(from);
        }
        if (to) {
            where.to = this.equalsInsensitive(to);
        }

        const transfers = await this.database.eRC20Transfer.findMany({
            where,
            orderBy: [{ blockNumber: 'desc' }, { logIndex: 'asc' }],
        });

        return this.serializeMany(transfers);
    }

    async getEventLogs(query: EventLogQueryDto): Promise<SerializedEntity[]> {
        const txHash = this.sanitize(query.txHash);
        const contractAddress = this.sanitize(query.contractAddress);

        if (!txHash && !contractAddress) {
            throw new BadRequestException('Provide txHash or contractAddress to query event logs.');
        }

        const where: Prisma.EventLogWhereInput = {};
        if (txHash) {
            where.txHash = this.equalsInsensitive(txHash);
        }
        if (contractAddress) {
            where.contractAddress = this.equalsInsensitive(contractAddress);
        }

        const logs = await this.database.eventLog.findMany({
            where,
            orderBy: [{ blockNumber: 'desc' }, { logIndex: 'asc' }],
        });

        return this.serializeMany(logs);
    }

    async getAddressBalances(query: AddressBalanceQueryDto): Promise<SerializedEntity[]> {
        const address = this.sanitize(query.address);
        const tokenAddress = this.sanitize(query.tokenAddress);

        if (!address && !tokenAddress) {
            throw new BadRequestException('Provide address or tokenAddress to query address balances.');
        }

        const where: Prisma.AddressBalanceWhereInput = {};
        if (address) {
            where.address = this.equalsInsensitive(address);
        }
        if (tokenAddress) {
            where.tokenAddress = this.equalsInsensitive(tokenAddress);
        }

        const balances = await this.database.addressBalance.findMany({
            where,
            orderBy: [{ address: 'asc' }, { tokenAddress: 'asc' }],
        });

        return this.serializeMany(balances);
    }

    async getTokenMeta(query: TokenMetaQueryDto): Promise<SerializedEntity[]> {
        const tokenAddress = this.sanitize(query.tokenAddress);

        if (!tokenAddress) {
            throw new BadRequestException('Provide tokenAddress to query token metadata.');
        }

        const meta = await this.database.tokenMeta.findMany({
            where: { tokenAddress: this.equalsInsensitive(tokenAddress) },
        });

        return this.serializeMany(meta);
    }

    async getCheckpoints(query: CheckpointQueryDto): Promise<SerializedEntity[]> {
        const chainId = query.chainId;
        const txHash = this.sanitize(query.txHash);
        const contractAddress = this.sanitize(query.contractAddress);

        if (chainId === undefined && !txHash && !contractAddress) {
            throw new BadRequestException('Provide chainId, txHash, or contractAddress to query checkpoints.');
        }

        let chainIds: number[] | null = null;
        if (typeof chainId === 'number') {
            chainIds = [chainId];
        }

        if (txHash || contractAddress) {
            const logWhere: Prisma.EventLogWhereInput = {};
            if (txHash) {
                logWhere.txHash = this.equalsInsensitive(txHash);
            }
            if (contractAddress) {
                logWhere.contractAddress = this.equalsInsensitive(contractAddress);
            }

            const logs = await this.database.eventLog.findMany({
                where: logWhere,
                select: { chainId: true },
            });

            const derived = Array.from(new Set(logs.map(log => log.chainId)));
            if (!derived.length) {
                return [];
            }

            chainIds = chainIds ? chainIds.filter(id => derived.includes(id)) : derived;
        }

        if (!chainIds || !chainIds.length) {
            return [];
        }

        const checkpoints = await this.database.checkpoint.findMany({
            where: chainIds.length === 1 ? { chainId: chainIds[0] } : { chainId: { in: chainIds } },
        });

        return this.serializeMany(checkpoints);
    }

    private sanitize(value?: string): string | undefined {
        if (typeof value !== 'string') {
            return undefined;
        }

        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }

    private toBigInt(value: number): bigint {
        if (!Number.isInteger(value)) {
            throw new BadRequestException('Block number must be an integer value.');
        }

        return BigInt(value);
    }

    private equalsInsensitive(value: string): Prisma.StringFilter {
        return {
            equals: value,
            mode: 'insensitive',
        };
    }

    private serializeMany<T>(payload: T[]): SerializedEntity[] {
        return payload.map(item => this.serialize(item));
    }

    private serialize(payload: unknown): SerializedEntity {
        return this.transform(payload) as SerializedEntity;
    }

    private transform(payload: unknown): unknown {
        if (payload === null || payload === undefined) {
            return payload;
        }

        if (Array.isArray(payload)) {
            return payload.map(item => this.transform(item));
        }

        if (payload instanceof Date) {
            return payload.toISOString();
        }

        if (typeof payload === 'bigint') {
            return payload.toString();
        }

        if (payload instanceof Decimal) {
            return payload.toString();
        }

        if (typeof payload === 'object') {
            return Object.entries(payload as Record<string, unknown>).reduce<Record<string, unknown>>(
                (acc, [key, value]) => {
                    acc[key] = this.transform(value);
                    return acc;
                },
                {},
            );
        }

        return payload;
    }
}
