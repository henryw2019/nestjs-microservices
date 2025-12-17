import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/common/services/database.service';
import { Wallet, getAddress } from 'ethers';
import { CreateKeyStoreDto } from './dtos/create-keystore.dto';
import { KeyType, Prisma } from '@repo/database/chain-service';
import { plainToInstance } from 'class-transformer';
import { KeystoreResponseDto } from './dtos/keystore.response.dto';
import { KeystoreQueryDto } from './dtos/keystore.query.dto';
import { PaginatedResult } from '@/common/interfaces/query-builder.interface';

@Injectable()
export class KeyStoreService {
    private readonly logger = new Logger(KeyStoreService.name);

    constructor(private readonly database: DatabaseService) {}

    async createForUser(userId: string, dto: CreateKeyStoreDto) {
        let address = dto.address;
        let privateKey: string | null = null;

        if (dto.keyType === KeyType.HOSTED || !dto.keyType) {
            const wallet = Wallet.createRandom();
            address = wallet.address;
            privateKey = wallet.privateKey;
        } else {
            if (!address) {
                throw new BadRequestException('Address is required for non-HOSTED keys');
            }
        }

        const normalizedAddress = getAddress(address!);

        const record = await (this.database as any).keyStore.create({
            data: {
                userId,
                address: normalizedAddress,
                privateKey: privateKey,
                accountName: dto.accountName || null,
                network: dto.network,
                chainId: dto.chainId,
                keyType: dto.keyType || KeyType.HOSTED,
            },
        });

        this.logger.log(`Created keystore for user ${userId} with address ${normalizedAddress}`);
        return plainToInstance(KeystoreResponseDto, record, { excludeExtraneousValues: true });
    }

    async getPublicByUserId(userId: string) {
        const records = await (this.database as any).keyStore.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' },
        });

        return plainToInstance(KeystoreResponseDto, records, { excludeExtraneousValues: true });
    }

    async findAll(query: KeystoreQueryDto): Promise<PaginatedResult<KeystoreResponseDto>> {
        const {
            page = 1,
            limit = 25,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            search,
            network,
            keyType,
        } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.KeyStoreWhereInput = {
            ...(network && { network }),
            ...(keyType && { keyType }),
            ...(search && {
                OR: [
                    { address: { contains: search, mode: 'insensitive' } },
                    { accountName: { contains: search, mode: 'insensitive' } },
                    { userId: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };

        const [total, records] = await Promise.all([
            (this.database as any).keyStore.count({ where }),
            (this.database as any).keyStore.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
            }),
        ]);

        const data = plainToInstance(KeystoreResponseDto, records, {
            excludeExtraneousValues: true,
        }) as unknown as KeystoreResponseDto[];

        return {
            items: data,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page * limit < total,
                hasPreviousPage: page > 1,
            },
        };
    }

    async getByAddress(address: string) {
        const normalizedAddress = getAddress(address);
        const rec = await (this.database as any).keyStore.findFirst({
            where: { address: normalizedAddress },
        });
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
}
