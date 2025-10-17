import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { Buffer } from 'buffer';


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

    async getBlocks(query: BlockQueryDto): Promise<{ items: SerializedEntity[]; pageInfo: { nextCursor?: string } }> {
        const blockNumber = query.number;
        const hash = this.sanitize(query.hash);

        const where: Prisma.BlockWhereInput = {};
        if (blockNumber !== undefined) {
            where.number = this.toBigInt(blockNumber);
        }
        if (hash) {
            where.hash = this.equalsInsensitive(hash);
        }

        // cursor-based pagination: cursor encodes last seen (number, hash)
        const limit = Math.min(1000, Math.max(1, (query.limit ?? 50)));
        let cursorFilter: Prisma.BlockWhereInput | undefined = undefined;
        if (query.cursor) {
            try {
                const decoded = JSON.parse(Buffer.from(query.cursor, 'base64').toString('utf8')) as { lastNumber?: string };
                if (decoded.lastNumber) {
                    // since ordering is number desc, fetch blocks with number < lastNumber
                    cursorFilter = { number: { lt: this.toBigInt(Number(decoded.lastNumber)) } };
                }
            } catch (e) {
                // ignore invalid cursor and treat as no cursor
            }
        }

        const client = this.database as any;
        const finalWhere: Prisma.BlockWhereInput = cursorFilter ? { AND: [where, cursorFilter] } : where;
        const blocks = await client.block.findMany({
            where: finalWhere,
            orderBy: { number: 'desc' },
            take: limit,
        });

        const items = this.serializeMany(blocks);
        const last = blocks[blocks.length - 1];
        const pageInfo: { nextCursor?: string } = {};
        if (blocks.length === limit && last) {
            pageInfo.nextCursor = Buffer.from(JSON.stringify({ lastNumber: last.number.toString() })).toString('base64');
        }

        return { items, pageInfo };
    }

    async getTransactions(query: TransactionQueryDto): Promise<{ items: SerializedEntity[]; pageInfo: { nextCursor?: string } }> {
        const hash = this.sanitize(query.hash);
        const from = this.sanitize(query.from);
        const to = this.sanitize(query.to);

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

        const limit = Math.min(1000, Math.max(1, (query.limit ?? 50)));
        let cursorFilter: Prisma.TxWhereInput | undefined = undefined;
        if (query.cursor) {
            try {
                const decoded = JSON.parse(Buffer.from(query.cursor, 'base64').toString('utf8')) as { lastBlockNumber?: string, lastHash?: string };
                if (decoded.lastBlockNumber && decoded.lastHash) {
                    // ordering by blockNumber desc => fetch blocks with blockNumber < lastBlockNumber OR equal and hash < lastHash
                    cursorFilter = {
                        OR: [
                            { blockNumber: { lt: this.toBigInt(Number(decoded.lastBlockNumber)) } },
                            { AND: [{ blockNumber: this.toBigInt(Number(decoded.lastBlockNumber)) }, { hash: { lt: decoded.lastHash } }] },
                        ],
                    } as Prisma.TxWhereInput;
                }
            } catch (e) {
                // ignore invalid cursor
            }
        }

        const client = this.database as any;
        const finalWhereTx: Prisma.TxWhereInput = cursorFilter ? { AND: [where, cursorFilter] } : where;
        const transactions = await client.tx.findMany({
            where: finalWhereTx,
            orderBy: { blockNumber: 'desc' },
            take: limit,
        });

        const items = this.serializeMany(transactions);
        const last = transactions[transactions.length - 1];
        const pageInfo: { nextCursor?: string } = {};
        if (transactions.length === limit && last) {
            pageInfo.nextCursor = Buffer.from(JSON.stringify({ lastBlockNumber: last.blockNumber.toString(), lastHash: last.hash })).toString('base64');
        }

        return { items, pageInfo };
    }

    async getErc20Transfers(query: Erc20TransferQueryDto): Promise<{ items: SerializedEntity[]; pageInfo: { nextCursor?: string } }> {
        const txHash = this.sanitize(query.txHash);
        const token = this.sanitize(query.token);
        const from = this.sanitize(query.from);
        const to = this.sanitize(query.to);
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

        const limit = Math.min(1000, Math.max(1, (query.limit ?? 50)));
        let cursorFilter: Prisma.ERC20TransferWhereInput | undefined = undefined;
        if (query.cursor) {
            try {
                const decoded = JSON.parse(Buffer.from(query.cursor, 'base64').toString('utf8')) as { lastBlockNumber?: string, lastLogIndex?: number };
                if (decoded.lastBlockNumber && typeof decoded.lastLogIndex === 'number') {
                    cursorFilter = {
                        OR: [
                            { blockNumber: { lt: this.toBigInt(Number(decoded.lastBlockNumber)) } },
                            { AND: [{ blockNumber: this.toBigInt(Number(decoded.lastBlockNumber)) }, { logIndex: { gt: decoded.lastLogIndex } }] },
                        ],
                    } as Prisma.ERC20TransferWhereInput;
                }
            } catch (e) {
                // ignore
            }
        }

        const client = this.database as any;
        const finalWhereErc: Prisma.ERC20TransferWhereInput = cursorFilter ? { AND: [where, cursorFilter] } : where;
        const transfers = await client.eRC20Transfer.findMany({
            where: finalWhereErc,
            orderBy: [{ blockNumber: 'desc' }, { logIndex: 'asc' }],
            take: limit,
        });

        const items = this.serializeMany(transfers);
        const last = transfers[transfers.length - 1];
        const pageInfo: { nextCursor?: string } = {};
        if (transfers.length === limit && last) {
            pageInfo.nextCursor = Buffer.from(JSON.stringify({ lastBlockNumber: last.blockNumber.toString(), lastLogIndex: last.logIndex })).toString('base64');
        }

        return { items, pageInfo };
    }

    async getEventLogs(query: EventLogQueryDto): Promise<{ items: SerializedEntity[]; pageInfo: { nextCursor?: string } }> {
        const txHash = this.sanitize(query.txHash);
        const contractAddress = this.sanitize(query.contractAddress);
        const where: Prisma.EventLogWhereInput = {};
        if (txHash) {
            where.txHash = this.equalsInsensitive(txHash);
        }
        if (contractAddress) {
            where.contractAddress = this.equalsInsensitive(contractAddress);
        }

        const limit = Math.min(1000, Math.max(1, (query.limit ?? 50)));
        let cursorFilter: Prisma.EventLogWhereInput | undefined = undefined;
        if (query.cursor) {
            try {
                const decoded = JSON.parse(Buffer.from(query.cursor, 'base64').toString('utf8')) as { lastBlockNumber?: string, lastLogIndex?: number };
                if (decoded.lastBlockNumber && typeof decoded.lastLogIndex === 'number') {
                    cursorFilter = {
                        OR: [
                            { blockNumber: { lt: this.toBigInt(Number(decoded.lastBlockNumber)) } },
                            { AND: [{ blockNumber: this.toBigInt(Number(decoded.lastBlockNumber)) }, { logIndex: { gt: decoded.lastLogIndex } }] },
                        ],
                    } as Prisma.EventLogWhereInput;
                }
            } catch (e) {
                // ignore
            }
        }

        const client = this.database as any;
        const finalWhereLogs: Prisma.EventLogWhereInput = cursorFilter ? { AND: [where, cursorFilter] } : where;
        const logs = await client.eventLog.findMany({
            where: finalWhereLogs,
            orderBy: [{ blockNumber: 'desc' }, { logIndex: 'asc' }],
            take: limit,
        });

        const items = this.serializeMany(logs);
        const last = logs[logs.length - 1];
        const pageInfo: { nextCursor?: string } = {};
        if (logs.length === limit && last) {
            pageInfo.nextCursor = Buffer.from(JSON.stringify({ lastBlockNumber: last.blockNumber.toString(), lastLogIndex: last.logIndex })).toString('base64');
        }

        return { items, pageInfo };
    }

    async getAddressBalances(query: AddressBalanceQueryDto): Promise<{ items: SerializedEntity[]; pageInfo: { nextCursor?: string } }> {
        const address = this.sanitize(query.address);
        const tokenAddress = this.sanitize(query.tokenAddress);
        const where: Prisma.AddressBalanceWhereInput = {};
        if (address) {
            where.address = this.equalsInsensitive(address);
        }
        if (tokenAddress) {
            where.tokenAddress = this.equalsInsensitive(tokenAddress);
        }

        const limit = Math.min(1000, Math.max(1, (query.limit ?? 50)));
        let cursorFilter: Prisma.AddressBalanceWhereInput | undefined = undefined;
        if (query.cursor) {
            try {
                const decoded = JSON.parse(Buffer.from(query.cursor, 'base64').toString('utf8')) as { lastAddress?: string };
                if (decoded.lastAddress) {
                    cursorFilter = { address: { gt: decoded.lastAddress } } as Prisma.AddressBalanceWhereInput;
                }
            } catch (e) {
                // ignore
            }
        }

        const client = this.database as any;
        const finalWhereBal: Prisma.AddressBalanceWhereInput = cursorFilter ? { AND: [where, cursorFilter] } : where;
        const balances = await client.addressBalance.findMany({
            where: finalWhereBal,
            orderBy: [{ address: 'asc' }, { tokenAddress: 'asc' }],
            take: limit,
        });

        const items = this.serializeMany(balances);
        const last = balances[balances.length - 1];
        const pageInfo: { nextCursor?: string } = {};
        if (balances.length === limit && last) {
            pageInfo.nextCursor = Buffer.from(JSON.stringify({ lastAddress: last.address })).toString('base64');
        }

        return { items, pageInfo };
    }

    async getTokenMeta(query: TokenMetaQueryDto): Promise<SerializedEntity[]> {
        // allow empty queries: if tokenAddress provided, filter; otherwise return empty list for safety
        const tokenAddress = this.sanitize(query.tokenAddress);

        if (!tokenAddress) {
            return [];
        }

        const client = this.database as any;
        const meta = await client.tokenMeta.findMany({
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

            const client = this.database as any;
            const logs = await client.eventLog.findMany({
                where: logWhere,
                select: { chainId: true },
            });

            const derived = Array.from(new Set(logs.map((log: any) => Number(log.chainId)))) as number[];
            if (!derived.length) {
                return [];
            }

            chainIds = chainIds ? chainIds.filter(id => derived.includes(id)) : derived;
        }

        if (!chainIds || !chainIds.length) {
            return [];
        }

        const client = this.database as any;
        const checkpoints = await client.checkpoint.findMany({
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
