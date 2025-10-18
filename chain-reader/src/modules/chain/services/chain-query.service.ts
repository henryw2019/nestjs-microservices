import { Injectable } from '@nestjs/common';
import { Prisma, Block, Tx, ERC20Transfer, EventLog, AddressBalance, TokenMeta } from '@prisma/client';
import { DatabaseService } from '../../../common/services/database.service';
import { QueryBuilderService } from '../../../common/services/query-builder.service';
import { PaginatedResult } from '../../../common/interfaces/query-builder.interface';
import { BlockListQueryDto } from '../dtos/block-list-query.dto';
import { BlockResponseDto } from '../dtos/block-response.dto';
import { TransactionListQueryDto } from '../dtos/transaction-list-query.dto';
import { TransactionResponseDto } from '../dtos/transaction-response.dto';
import { Erc20TransferListQueryDto } from '../dtos/erc20-transfer-list-query.dto';
import { Erc20TransferResponseDto } from '../dtos/erc20-transfer-response.dto';
import { EventLogListQueryDto } from '../dtos/event-log-list-query.dto';
import { EventLogResponseDto } from '../dtos/event-log-response.dto';
import { AddressBalanceListQueryDto } from '../dtos/address-balance-list-query.dto';
import { AddressBalanceResponseDto } from '../dtos/address-balance-response.dto';
import { TokenMetaListQueryDto } from '../dtos/token-meta-list-query.dto';
import { TokenMetaResponseDto } from '../dtos/token-meta-response.dto';

@Injectable()
export class ChainQueryService {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly queryBuilderService: QueryBuilderService,
    ) {}

    async getBlocks(query: BlockListQueryDto): Promise<PaginatedResult<BlockResponseDto>> {
        const where: Prisma.BlockWhereInput = {};

        if (query.hash) {
            where.hash = query.hash;
        }

        if (query.number) {
            where.number = BigInt(query.number);
        }

        if (query.fromNumber || query.toNumber) {
            where.number = {
                ...(typeof where.number === 'bigint' ? { equals: where.number } : {}),
                ...(query.fromNumber ? { gte: BigInt(query.fromNumber) } : {}),
                ...(query.toNumber ? { lte: BigInt(query.toNumber) } : {}),
            } as Prisma.BigIntFilter;
        }

        if (query.fromTimestamp || query.toTimestamp) {
            where.timestamp = {
                ...(query.fromTimestamp ? { gte: new Date(query.fromTimestamp) } : {}),
                ...(query.toTimestamp ? { lte: new Date(query.toTimestamp) } : {}),
            };
        }

        const paginationDto = this.pickPagination(query);

        const result = await this.queryBuilderService.findManyWithPagination<Block & {
            _count: {
                txs: number;
                erc20Transfers: number;
                eventLogs: number;
            };
        }>({
            model: 'block',
            dto: paginationDto,
            defaultSort: { field: 'number', order: 'desc' },
            searchFields: ['hash'],
            customFilters: where,
            include: {
                _count: {
                    select: {
                        txs: true,
                        erc20Transfers: true,
                        eventLogs: true,
                    },
                },
            },
        });

        return {
            meta: result.meta,
            items: result.items.map(block => this.mapBlock(block)),
        };
    }

    async getBlockByNumber(number: string): Promise<BlockResponseDto | null> {
        const block = await this.databaseService.block.findUnique({
            where: { number: BigInt(number) },
            include: {
                _count: {
                    select: { txs: true, erc20Transfers: true, eventLogs: true },
                },
            },
        });

        if (!block) {
            return null;
        }

        return this.mapBlock(block);
    }

    async getTransactions(
        query: TransactionListQueryDto,
    ): Promise<PaginatedResult<TransactionResponseDto>> {
        const where: Prisma.TxWhereInput = {};

        if (query.hash) {
            where.hash = query.hash;
        }

        if (query.blockNumber) {
            where.blockNumber = BigInt(query.blockNumber);
        }

        if (query.from) {
            where.from = query.from;
        }

        if (query.to) {
            where.to = query.to;
        }

        if (query.minValue || query.maxValue) {
            where.value = {
                ...(query.minValue ? { gte: new Prisma.Decimal(query.minValue) } : {}),
                ...(query.maxValue ? { lte: new Prisma.Decimal(query.maxValue) } : {}),
            };
        }

        const paginationDto = this.pickPagination(query);

    const result = await this.queryBuilderService.findManyWithPagination<Tx>({
            model: 'tx',
            dto: paginationDto,
            defaultSort: { field: 'blockNumber', order: 'desc' },
            searchFields: ['hash', 'from', 'to'],
            customFilters: where,
        });

        return {
            meta: result.meta,
            items: result.items.map(tx => this.mapTransaction(tx)),
        };
    }

    async getTransactionByHash(hash: string): Promise<TransactionResponseDto | null> {
        const tx = await this.databaseService.tx.findUnique({ where: { hash } });
        return tx ? this.mapTransaction(tx) : null;
    }

    async getErc20Transfers(
        query: Erc20TransferListQueryDto,
    ): Promise<PaginatedResult<Erc20TransferResponseDto>> {
        const where: Prisma.ERC20TransferWhereInput = {};

        if (query.txHash) {
            where.txHash = query.txHash;
        }

        if (query.token) {
            where.token = query.token;
        }

        if (query.from) {
            where.from = query.from;
        }

        if (query.to) {
            where.to = query.to;
        }

        if (query.blockNumber) {
            where.blockNumber = BigInt(query.blockNumber);
        }

        if (query.minValue || query.maxValue) {
            where.value = {
                ...(query.minValue ? { gte: new Prisma.Decimal(query.minValue) } : {}),
                ...(query.maxValue ? { lte: new Prisma.Decimal(query.maxValue) } : {}),
            };
        }

        const paginationDto = this.pickPagination(query);

    const result = await this.queryBuilderService.findManyWithPagination<ERC20Transfer>({
            model: 'eRC20Transfer',
            dto: paginationDto,
            defaultSort: { field: 'blockNumber', order: 'desc' },
            searchFields: ['txHash', 'token', 'from', 'to'],
            customFilters: where,
        });

        return {
            meta: result.meta,
            items: result.items.map(transfer => this.mapErc20Transfer(transfer)),
        };
    }

    async getEventLogs(query: EventLogListQueryDto): Promise<PaginatedResult<EventLogResponseDto>> {
        const where: Prisma.EventLogWhereInput = {};

        if (query.chainId) {
            where.chainId = Number(query.chainId);
        }

        if (query.blockNumber) {
            where.blockNumber = BigInt(query.blockNumber);
        }

        if (query.txHash) {
            where.txHash = query.txHash;
        }

        if (query.contractAddress) {
            where.contractAddress = query.contractAddress;
        }

        if (query.eventName) {
            where.eventName = { equals: query.eventName, mode: 'insensitive' };
        }

        if (query.eventSignature) {
            where.eventSignature = query.eventSignature;
        }

        if (query.processed !== undefined) {
            where.processed = query.processed === 'true';
        }

        const paginationDto = this.pickPagination(query);

    const result = await this.queryBuilderService.findManyWithPagination<EventLog>({
            model: 'eventLog',
            dto: paginationDto,
            defaultSort: { field: 'blockNumber', order: 'desc' },
            searchFields: ['eventName', 'eventSignature', 'contractAddress', 'txHash'],
            customFilters: where,
        });

        return {
            meta: result.meta,
            items: result.items.map(event => this.mapEventLog(event)),
        };
    }

    async getAddressBalances(
        query: AddressBalanceListQueryDto,
    ): Promise<PaginatedResult<AddressBalanceResponseDto>> {
        const where: Prisma.AddressBalanceWhereInput = {};

        if (query.address) {
            where.address = query.address;
        }

        if (query.tokenAddress) {
            where.tokenAddress = query.tokenAddress;
        }

        const paginationDto = this.pickPagination(query);

    const result = await this.queryBuilderService.findManyWithPagination<AddressBalance>({
            model: 'addressBalance',
            dto: paginationDto,
            defaultSort: { field: 'lastUpdatedAt', order: 'desc' },
            allowedSortFields: ['lastUpdatedAt', 'address', 'tokenAddress', 'balance', 'id'],
            searchFields: ['address', 'tokenAddress'],
            customFilters: where,
        });

        return {
            meta: result.meta,
            items: result.items.map(balance => this.mapAddressBalance(balance)),
        };
    }

    async getTokenMeta(query: TokenMetaListQueryDto): Promise<PaginatedResult<TokenMetaResponseDto>> {
        const where: Prisma.TokenMetaWhereInput = {};

        if (query.tokenAddress) {
            where.tokenAddress = query.tokenAddress;
        }

        if (query.symbol) {
            where.symbol = { contains: query.symbol, mode: 'insensitive' };
        }

        if (query.name) {
            where.name = { contains: query.name, mode: 'insensitive' };
        }

        const paginationDto = this.pickPagination(query);

    const result = await this.queryBuilderService.findManyWithPagination<TokenMeta>({
            model: 'tokenMeta',
            dto: paginationDto,
            defaultSort: { field: 'tokenAddress', order: 'asc' },
            searchFields: ['tokenAddress', 'symbol', 'name'],
            customFilters: where,
        });

        return {
            meta: result.meta,
            items: result.items.map(meta => this.mapTokenMeta(meta)),
        };
    }

    async getTokenMetaByAddress(tokenAddress: string): Promise<TokenMetaResponseDto | null> {
        const tokenMeta = await this.databaseService.tokenMeta.findUnique({ where: { tokenAddress } });
        return tokenMeta ? this.mapTokenMeta(tokenMeta) : null;
    }

    private pickPagination<T extends { page?: number; limit?: number; sortBy?: string; sortOrder?: string; search?: string }>(
        dto: T,
    ) {
        return {
            page: dto.page,
            limit: dto.limit,
            sortBy: dto.sortBy,
            sortOrder: dto.sortOrder,
            search: dto.search,
        };
    }

    private mapBlock(block: Block & {
        _count?: {
            txs: number;
            erc20Transfers: number;
            eventLogs: number;
        };
    }): BlockResponseDto {
        return {
            number: block.number.toString(),
            hash: block.hash,
            timestamp: block.timestamp.toISOString(),
            transactionCount: block._count?.txs ?? 0,
            erc20TransferCount: block._count?.erc20Transfers ?? 0,
            eventLogCount: block._count?.eventLogs ?? 0,
        };
    }

    private mapTransaction(tx: Tx): TransactionResponseDto {
        return {
            hash: tx.hash,
            blockNumber: tx.blockNumber.toString(),
            from: tx.from,
            to: tx.to,
            value: tx.value.toString(),
        };
    }

    private mapErc20Transfer(transfer: ERC20Transfer): Erc20TransferResponseDto {
        return {
            id: transfer.id.toString(),
            txHash: transfer.txHash,
            blockNumber: transfer.blockNumber.toString(),
            logIndex: transfer.logIndex,
            token: transfer.token,
            from: transfer.from,
            to: transfer.to,
            value: transfer.value.toString(),
        };
    }

    private mapEventLog(event: EventLog): EventLogResponseDto {
        return {
            id: event.id.toString(),
            chainId: event.chainId,
            blockNumber: event.blockNumber.toString(),
            blockHash: event.blockHash,
            txHash: event.txHash,
            logIndex: event.logIndex,
            contractAddress: event.contractAddress,
            eventName: event.eventName,
            eventSignature: event.eventSignature,
            indexedArgs: (event.indexedArgs as Record<string, unknown>) ?? null,
            dataArgs: (event.dataArgs as Record<string, unknown>) ?? null,
            raw: (event.raw as Record<string, unknown>) ?? null,
            processed: event.processed,
        };
    }

    private mapAddressBalance(balance: AddressBalance): AddressBalanceResponseDto {
        return {
            id: balance.id.toString(),
            address: balance.address,
            tokenAddress: balance.tokenAddress,
            balance: balance.balance.toString(),
            lastUpdatedAt: balance.lastUpdatedAt.toISOString(),
        };
    }

    private mapTokenMeta(meta: TokenMeta): TokenMetaResponseDto {
        return {
            tokenAddress: meta.tokenAddress,
            name: meta.name,
            symbol: meta.symbol,
            decimals: meta.decimals,
            totalSupply: meta.totalSupply ? meta.totalSupply.toString() : null,
            lastUpdatedAt: meta.lastUpdatedAt.toISOString(),
        };
    }
}
