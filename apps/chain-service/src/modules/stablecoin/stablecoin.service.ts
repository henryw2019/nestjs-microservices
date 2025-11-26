import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
    InternalServerErrorException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/services/database.service';
import { KeyStoreService } from '../keystore/keystore.service';
import { TransferService } from '../keystore/transfer.service';
import { CreateSubscriptionDto, CreateRedemptionDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderFilterDto } from './dto/order-filter.dto';
import { OrderType, OrderStatus, Prisma } from '@repo/database/chain-service';
import { JsonRpcProvider, Wallet, Contract, getAddress } from 'ethers';
import { ConfigService } from '@nestjs/config';

const ERC20_ABI = [
    'function transfer(address to, uint256 amount) returns (bool)',
    'function balanceOf(address owner) view returns (uint256)',
];

@Injectable()
export class StablecoinService {
    private readonly logger = new Logger(StablecoinService.name);
    private provider: JsonRpcProvider;

    constructor(
        private readonly database: DatabaseService,
        private readonly keyStoreService: KeyStoreService,
        private readonly transferService: TransferService,
        private readonly configService: ConfigService,
    ) {
        const rpcUrl = this.configService.get<string>('RPC_URL') || 'http://localhost:8545';
        this.provider = new JsonRpcProvider(rpcUrl);
    }

    async createSubscription(userId: string, dto: CreateSubscriptionDto) {
        return this.database.stablecoinOrder.create({
            data: {
                userId,
                type: OrderType.SUBSCRIPTION,
                status: OrderStatus.PENDING,
                amount: dto.amount,
                currencyContractAddress: dto.currencyContractAddress,
                walletAddress: dto.receivingAddress,
            },
        });
    }

    async createRedemption(userId: string, dto: CreateRedemptionDto) {
        // 0. Check Configuration
        const issuerAddress = this.configService.get<string>('ISSUER_WALLET_ADDRESS');
        if (!issuerAddress) {
            this.logger.error('ISSUER_WALLET_ADDRESS is not configured');
            throw new InternalServerErrorException(
                'Server configuration error: Issuer address missing',
            );
        }

        // 1. Verify user has a hosted wallet (we assume the first one found is the one to use, or we could ask user to specify)
        // For simplicity, we get the user's primary keystore
        const keyStore = await this.keyStoreService.getSecretByUserId(userId);
        if (!keyStore) {
            throw new BadRequestException('User does not have a hosted wallet');
        }

        // 2. Create Order
        const order = await this.database.stablecoinOrder.create({
            data: {
                userId,
                type: OrderType.REDEMPTION,
                status: OrderStatus.PENDING,
                amount: dto.amount,
                currencyContractAddress: dto.currencyContractAddress,
                walletAddress: keyStore.address, // From address
                bankName: dto.bankName,
                accountName: dto.accountName,
                accountNumber: dto.accountNumber,
            },
        });

        // 3. Trigger Transfer
        try {
            // Use TransferService to handle the transfer
            const transferResult = await this.transferService.sendErc20(userId, {
                from: keyStore.address,
                to: issuerAddress,
                amount: dto.amount,
                token: dto.currencyContractAddress,
            });

            // Update order with txHash
            return this.database.stablecoinOrder.update({
                where: { id: order.id },
                data: {
                    status: OrderStatus.PROCESSING, // Waiting for Fiat transfer
                    txHash: transferResult.hash,
                    toAddress: issuerAddress,
                },
            });
        } catch (error) {
            this.logger.error(`Redemption transfer failed for order ${order.id}`, error);
            // Mark as failed or keep as PENDING for retry?
            // Let's mark as FAILED for now so admin knows.
            await this.database.stablecoinOrder.update({
                where: { id: order.id },
                data: {
                    status: OrderStatus.FAILED,
                    remark: `Transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                },
            });
            throw new BadRequestException('Failed to execute redemption transfer on-chain');
        }
    }

    private async executeTransfer(
        privateKey: string,
        tokenAddress: string,
        toAddress: string,
        amount: string,
    ): Promise<string> {
        const wallet = new Wallet(privateKey, this.provider);
        const contract = new Contract(tokenAddress, ERC20_ABI, wallet);

        // Optional: Check balance
        // const balance = await contract.balanceOf(wallet.address);
        // if (balance < BigInt(amount)) throw new Error('Insufficient balance');

        const tx = await contract.transfer(toAddress, amount);
        this.logger.log(`Transfer tx sent: ${tx.hash}`);
        // We don't wait for confirmation here to keep response fast, or we could.
        // For safety, maybe wait 1 confirmation?
        // await tx.wait(1);
        return tx.hash;
    }

    async findAll(userId: string) {
        return this.database.stablecoinOrder.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findAllPending() {
        return this.database.stablecoinOrder.findMany({
            where: { status: OrderStatus.PENDING },
            orderBy: { createdAt: 'asc' },
        });
    }

    async findAllByFilter(filter: OrderFilterDto) {
        const where: Prisma.StablecoinOrderWhereInput = {};

        if (filter.userId) where.userId = filter.userId;
        if (filter.type) where.type = filter.type;
        if (filter.status) where.status = filter.status;

        if (filter.startDate || filter.endDate) {
            where.createdAt = {};
            if (filter.startDate) where.createdAt.gte = new Date(filter.startDate);
            if (filter.endDate) where.createdAt.lte = new Date(filter.endDate);
        }

        return this.database.stablecoinOrder.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
    }

    async updateOrder(orderId: string, dto: UpdateOrderDto) {
        return this.database.stablecoinOrder.update({
            where: { id: orderId },
            data: {
                ...(dto.status && { status: dto.status }),
                ...(dto.txHash && { txHash: dto.txHash }),
                ...(dto.remark && { remark: dto.remark }),
            },
        });
    }

    async processSubscription(orderId: string, txHash: string) {
        const order = await this.database.stablecoinOrder.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        if (order.type !== OrderType.SUBSCRIPTION) {
            throw new BadRequestException('Order is not a subscription');
        }

        if (order.status !== OrderStatus.PENDING) {
            throw new BadRequestException('Order is not in PENDING status');
        }

        return this.database.stablecoinOrder.update({
            where: { id: orderId },
            data: {
                status: OrderStatus.COMPLETED,
                txHash: txHash,
            },
        });
    }

    async executeSubscriptionTransfer(orderId: string, adminUserId: string, fromAddress: string) {
        const order = await this.database.stablecoinOrder.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        if (order.type !== OrderType.SUBSCRIPTION) {
            throw new BadRequestException('Order is not a subscription');
        }

        if (order.status !== OrderStatus.PENDING) {
            throw new BadRequestException('Order is not in PENDING status');
        }

        // Find Admin's Wallet (Issuer Wallet)
        // We assume the admin has a keystore that holds the stablecoins
        const adminKeyStore = await this.keyStoreService.getSecretByUserIdAndAddress(
            adminUserId,
            fromAddress,
        );
        if (!adminKeyStore) {
            throw new BadRequestException('Admin wallet not found in keystore');
        }

        try {
            // Use TransferService to handle the transfer from Admin to User
            const transferResult = await this.transferService.sendErc20(adminUserId, {
                from: adminKeyStore.address,
                to: order.walletAddress, // User's receiving address
                amount: order.amount.toString(),
                token: order.currencyContractAddress,
            });

            return this.database.stablecoinOrder.update({
                where: { id: orderId },
                data: {
                    status: OrderStatus.COMPLETED,
                    txHash: transferResult.hash,
                    toAddress: order.walletAddress,
                },
            });
        } catch (error) {
            this.logger.error(`Subscription transfer failed for order ${order.id}`, error);
            await this.database.stablecoinOrder.update({
                where: { id: order.id },
                data: {
                    status: OrderStatus.FAILED,
                    remark: `Transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                },
            });
            throw new BadRequestException('Failed to execute subscription transfer on-chain');
        }
    }
}
