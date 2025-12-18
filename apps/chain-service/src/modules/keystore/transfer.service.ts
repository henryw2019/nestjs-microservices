import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import {
    JsonRpcProvider,
    getAddress,
    Wallet,
    Contract,
    TransactionResponse,
    Interface,
    Transaction,
    formatUnits,
} from 'ethers';
import { KeyStoreService } from './keystore.service';
import { AmlService } from '../aml/aml.service';
import { DatabaseService } from '../../common/services/database.service';
import { KeyType, OfflineTransactionStatus } from '@repo/database/chain-service';
// import { BadRequestException as AmlBlock } from '@nestjs/common';
import { TransferDto } from './dtos/transfer.dto';
import { TransferResponseDto } from './dtos/transfer.response.dto';
import { BuildTransactionDto } from './dtos/build-transaction.dto';
import { UnsignedTransactionResponseDto } from './dtos/unsigned-transaction-response.dto';
import { SubmitSignedTransactionDto } from './dtos/submit-signed-transaction.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class TransferService {
    constructor(
        private readonly keyStoreService: KeyStoreService,
        private readonly amlService: AmlService,
        private readonly database: DatabaseService,
    ) {}

    private getProvider() {
        const url = process.env.ETH_RPC_URL || 'http://127.0.0.1:8545';
        const provider = new JsonRpcProvider(url, Number(process.env.CHAIN_ID || 31337));
        return provider;
    }

    async sendNative(userId: string, dto: TransferDto): Promise<TransferResponseDto> {
        try {
            const fromAddress = getAddress(dto.from);
            const fromRec = await this.keyStoreService.getSecretByUserIdAndAddress(
                userId,
                fromAddress,
            );
            // // AML realtime scan before submitting tx
            // const toAddress = getAddress(dto.to);
            // let toUserId = 'external';
            // try {
            //     const toRec = await this.keyStoreService.getByAddress(toAddress);
            //     toUserId = toRec.userId;
            // } catch (_) {
            //     // keep default 'external'
            // }
            // const scan = await this.amlService.scanTransfer({
            //     from: { userId, address: fromAddress },
            //     to: { userId: toUserId, address: toAddress },
            //     amount: dto.amount,
            // });
            // if (this.amlService.shouldBlock(scan.decision)) {
            //     throw new AmlBlock(`AML blocked transfer: ${scan.decision}`);
            // }
            const provider = this.getProvider();
            const wallet = new Wallet(fromRec.privateKey, provider);
            const tx = {
                to: dto.to,
                value: BigInt(dto.amount),
                gasLimit: dto.gasLimit ? BigInt(dto.gasLimit) : undefined,
            } as any;

            const resp = await wallet.sendTransaction(tx);
            // // link AML record to tx
            // try { await this.amlService.linkTx(scan.scanId, resp.hash); } catch {}
            return this.buildTransferResponse(resp, {
                from: fromAddress,
                to: dto.to,
                amount: dto.amount,
                token: undefined,
            });
        } catch (error) {
            this.handleTransferError(error);
        }
    }

    async sendErc20(userId: string, dto: TransferDto): Promise<TransferResponseDto> {
        if (!dto.token) throw new NotFoundException('Token contract not provided');

        try {
            const fromAddress = getAddress(dto.from);
            const fromRec = await this.keyStoreService.getSecretByUserIdAndAddress(
                userId,
                fromAddress,
            );
            // // AML realtime scan before submitting tx
            // const toAddress = getAddress(dto.to);
            // let toUserId = 'external';
            // try {
            //     const toRec = await this.keyStoreService.getByAddress(toAddress);
            //     toUserId = toRec.userId;
            // } catch (_) {}
            // const scan = await this.amlService.scanTransfer({
            //     from: { userId, address: fromAddress },
            //     to: { userId: toUserId, address: toAddress },
            //     amount: dto.amount,
            //     tokenAddress: dto.token,
            // });
            // if (this.amlService.shouldBlock(scan.decision)) {
            //     throw new AmlBlock(`AML blocked transfer: ${scan.decision}`);
            // }
            const provider = this.getProvider();
            const wallet = new Wallet(fromRec.privateKey, provider);
            const abi = ['function transfer(address to, uint256 amount) public returns (bool)'];
            const contract = new Contract(dto.token, abi, wallet);
            const tx = await contract.transfer(dto.to, dto.amount);
            // try {
            //     await this.amlService.linkTx(scan.scanId, tx.hash);
            // } catch {}
            return this.buildTransferResponse(tx, {
                from: fromAddress,
                to: dto.to,
                amount: dto.amount,
                token: dto.token,
            });
        } catch (error) {
            this.handleTransferError(error);
        }
    }

    private buildTransferResponse(
        response: TransactionResponse,
        options: { from: string; to: string; amount: string; token?: string },
    ): TransferResponseDto {
        const chainIdFallback = Number(process.env.CHAIN_ID || 0);
        return {
            hash: response.hash,
            from: options.from,
            to: options.to,
            amount: options.amount,
            token: options.token,
            nonce: response.nonce,
            chainId: typeof response.chainId === 'number' ? response.chainId : chainIdFallback,
            gasLimit: response.gasLimit ? response.gasLimit.toString() : undefined,
        };
    }

    private handleTransferError(error: unknown): never {
        if (error instanceof HttpException) {
            throw error;
        }

        const normalizedError = this.normalizeProviderError(error);
        throw normalizedError;
    }

    private normalizeProviderError(error: unknown): HttpException {
        const fallback = 'Blockchain transaction failed';

        if (error && typeof error === 'object') {
            const { message, code } = this.extractErrorDetails(
                error as Record<string, any>,
                fallback,
            );
            const normalizedCode = typeof code === 'string' ? code.toUpperCase() : code;

            const badRequestCodes = new Set<string | number>([
                'INSUFFICIENT_FUNDS',
                'UNPREDICTABLE_GAS_LIMIT',
                'CALL_EXCEPTION',
                'ACTION_REJECTED',
                'INVALID_ARGUMENT',
                'NONCE_EXPIRED',
                'REPLACEMENT_UNDERPRICED',
                'TRANSACTION_REPLACED',
                -32000,
                -32001,
                -32002,
                -32602,
            ]);

            const normalizedMessage = message ?? fallback;
            const messageMatchesClientIssue =
                /insufficient funds|gas|execution reverted|underpriced|nonce|replacement|already known|transaction|balance/i.test(
                    normalizedMessage,
                );

            if (
                (typeof normalizedCode === 'string' && badRequestCodes.has(normalizedCode)) ||
                (typeof normalizedCode === 'number' && badRequestCodes.has(normalizedCode)) ||
                (normalizedCode === 'SERVER_ERROR' && messageMatchesClientIssue)
            ) {
                return new BadRequestException(normalizedMessage);
            }

            if (
                typeof normalizedCode === 'number' &&
                normalizedCode >= -32099 &&
                normalizedCode <= -32000
            ) {
                return new BadRequestException(normalizedMessage);
            }

            if (messageMatchesClientIssue) {
                return new BadRequestException(normalizedMessage);
            }

            return new InternalServerErrorException(normalizedMessage);
        }

        return new InternalServerErrorException(fallback);
    }

    private extractErrorDetails(
        error: Record<string, any>,
        fallback: string,
    ): { message: string; code?: string | number } {
        const nestedMessages: Array<string | undefined> = [];

        const code =
            error.code ??
            error.error?.code ??
            error.error?.data?.code ??
            error.error?.error?.code ??
            error.statusCode;

        nestedMessages.push(
            error.reason,
            error.error?.reason,
            error.error?.data?.reason,
            error.error?.error?.reason,
            error.error?.message,
            error.error?.data?.message,
            error.error?.error?.message,
            error.data?.message,
            error.shortMessage,
            error.message,
        );

        if (typeof error.error?.body === 'string') {
            const parsed = this.tryParseJson(error.error.body);
            if (parsed) {
                nestedMessages.push(
                    parsed.error?.message,
                    parsed.error?.data?.message,
                    parsed.error?.data?.reason,
                );
            }
        }

        if (typeof error.body === 'string') {
            const parsed = this.tryParseJson(error.body);
            if (parsed) {
                nestedMessages.push(
                    parsed.error?.message,
                    parsed.error?.data?.message,
                    parsed.error?.data?.reason,
                );
            }
        }

        const message = this.cleanMessage(this.pickBestMessage(nestedMessages, fallback));

        return { message, code };
    }

    private tryParseJson(payload: string): any | null {
        try {
            return JSON.parse(payload);
        } catch (err) {
            return null;
        }
    }

    private cleanMessage(message: string): string {
        const processingMatch = message.match(/reason=['\"]([^'\"]+)['\"]/i);
        if (processingMatch && processingMatch[1]) {
            return processingMatch[1];
        }

        const cleaned = message
            .replace(/^Error: /i, '')
            .replace(/^execution reverted:?\s*/i, '')
            .replace(/^reverted:?\s*/i, '')
            .trim();

        return cleaned.length > 0 ? cleaned : message;
    }

    private pickBestMessage(candidates: Array<string | undefined>, fallback: string): string {
        const cleanedCandidates = candidates
            .filter((msg): msg is string => typeof msg === 'string' && msg.trim().length > 0)
            .map(msg => msg.trim());

        const genericPatterns = [
            /processing response error/i,
            /transaction failed/i,
            /error sending/i,
        ];

        for (const candidate of cleanedCandidates) {
            const isGeneric = genericPatterns.some(pattern => pattern.test(candidate));
            if (!isGeneric) {
                return candidate;
            }
        }

        return cleanedCandidates[0] ?? fallback;
    }

    async buildUnsignedTransaction(
        userId: string,
        dto: BuildTransactionDto,
    ): Promise<UnsignedTransactionResponseDto> {
        const fromAddress = getAddress(dto.from);

        // 1. Verify user ownership and key type
        const keyStore = await this.keyStoreService.getSecretByUserIdAndAddress(
            userId,
            fromAddress,
        );
        if (keyStore.keyType !== KeyType.SELF_CUSTODY) {
            throw new ForbiddenException(
                'Offline signing is only available for SELF_CUSTODY wallets',
            );
        }

        const provider = this.getProvider();
        const chainId = dto.chainId || Number(process.env.CHAIN_ID || 31337);

        let toAddress = getAddress(dto.to);
        let value = BigInt(dto.amount);
        let data = '0x';
        let tokenAddress: string | null = null;
        let readableData: any = {};

        // 2. Determine transaction type and encode data
        if (dto.token) {
            // ERC20 Transfer
            tokenAddress = getAddress(dto.token);
            const iface = new Interface(['function transfer(address to, uint256 amount)']);
            data = iface.encodeFunctionData('transfer', [toAddress, value]);

            // For ERC20, 'to' is the token contract, value is 0 (ETH)
            readableData = {
                transactionType: 'ERC20_TRANSFER',
                from: fromAddress,
                to: toAddress,
                amount: `${dto.amount} (raw units)`, // Ideally fetch decimals
                token: tokenAddress,
                description: `Transfer ${dto.amount} (raw) of token ${tokenAddress} to ${toAddress}`,
            };

            // Update transaction fields for ERC20
            toAddress = tokenAddress; // The transaction is sent to the token contract
            value = BigInt(0); // No ETH is sent
        } else {
            // Native ETH Transfer
            readableData = {
                transactionType: 'ETH_TRANSFER',
                from: fromAddress,
                to: toAddress,
                amount: `${formatUnits(value, 18)} ETH`,
                description: `Transfer ${formatUnits(value, 18)} ETH to ${toAddress}`,
            };
        }

        // 3. Get nonce and estimate gas
        const nonce = await provider.getTransactionCount(fromAddress, 'pending');

        const txRequest = {
            from: fromAddress,
            to: toAddress,
            value: value,
            data: data,
            chainId: chainId,
        };

        let gasLimit = BigInt(21000); // Default for ETH transfer
        try {
            gasLimit = await provider.estimateGas(txRequest);
        } catch (error: any) {
            // Fallback or rethrow? For now, let's try to use provided limit or default for ERC20
            if (dto.gasLimit) {
                gasLimit = BigInt(dto.gasLimit);
            } else if (dto.token) {
                gasLimit = BigInt(65000); // Typical ERC20 transfer gas
            } else {
                throw new InternalServerErrorException(`Gas estimation failed: ${error.message}`);
            }
        }

        // Override if provided
        if (dto.gasLimit) {
            gasLimit = BigInt(dto.gasLimit);
        }

        // 4. Fee strategy
        let gasPrice: bigint | undefined;
        let maxFeePerGas: bigint | undefined;
        let maxPriorityFeePerGas: bigint | undefined;

        if (dto.gasPrice) {
            gasPrice = BigInt(dto.gasPrice);
        } else if (dto.maxFeePerGas || dto.maxPriorityFeePerGas) {
            maxFeePerGas = dto.maxFeePerGas ? BigInt(dto.maxFeePerGas) : undefined;
            maxPriorityFeePerGas = dto.maxPriorityFeePerGas
                ? BigInt(dto.maxPriorityFeePerGas)
                : undefined;
        } else {
            // Default to provider fee data
            const feeData = await provider.getFeeData();
            if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
                maxFeePerGas = feeData.maxFeePerGas;
                maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
            } else {
                gasPrice = feeData.gasPrice || undefined;
            }
        }

        // 5. Create OfflineTransaction record
        const transactionId = randomUUID();
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

        await this.database.offlineTransaction.create({
            data: {
                transactionId,
                userId,
                from: fromAddress,
                to: toAddress,
                value: value.toString(), // Store as string for Decimal
                data,
                nonce,
                chainId,
                gasLimit: gasLimit.toString(),
                gasPrice: gasPrice?.toString(),
                maxFeePerGas: maxFeePerGas?.toString(),
                maxPriorityFeePerGas: maxPriorityFeePerGas?.toString(),
                token: tokenAddress,
                status: OfflineTransactionStatus.CREATED,
                expiresAt,
            },
        });

        // 6. Construct response
        const transactionObj = {
            from: fromAddress,
            to: toAddress,
            value: value.toString(),
            data,
            nonce,
            gasLimit: gasLimit.toString(),
            gasPrice: gasPrice?.toString(),
            maxFeePerGas: maxFeePerGas?.toString(),
            maxPriorityFeePerGas: maxPriorityFeePerGas?.toString(),
            chainId,
        };

        const response: UnsignedTransactionResponseDto = {
            transactionId,
            transaction: transactionObj as any,
            expiresAt: expiresAt.toISOString(),
            readableData,
            qrCodeData: JSON.stringify({
                transactionId,
                transaction: transactionObj,
                expiresAt: expiresAt.toISOString(),
                readableData,
                version: 1,
            }),
        };

        return response;
    }

    async submitSignedTransaction(
        dto: SubmitSignedTransactionDto,
    ): Promise<{ transactionId: string; txHash: string; status: string }> {
        // 1. Retrieve transaction record
        const record = await this.database.offlineTransaction.findUnique({
            where: { transactionId: dto.transactionId },
        });

        if (!record) {
            throw new NotFoundException('Transaction not found');
        }

        // 2. Validate status and expiration
        if (record.status !== OfflineTransactionStatus.CREATED) {
            throw new ConflictException(`Transaction status is ${record.status}, expected CREATED`);
        }

        if (new Date() > record.expiresAt) {
            await this.database.offlineTransaction.update({
                where: { id: record.id },
                data: { status: OfflineTransactionStatus.EXPIRED },
            });
            throw new ConflictException('Transaction has expired');
        }

        // 3. Parse signed transaction
        let parsedTx: Transaction;
        try {
            parsedTx = Transaction.from(dto.signedTx);
        } catch (error) {
            throw new BadRequestException('Invalid signed transaction format');
        }

        // 4. Strict consistency check
        const isMatch =
            getAddress(parsedTx.from!) === getAddress(record.from) &&
            getAddress(parsedTx.to!) === getAddress(record.to) &&
            parsedTx.value === BigInt(record.value.toFixed()) &&
            parsedTx.data.toLowerCase() === (record.data || '0x').toLowerCase() &&
            parsedTx.nonce === record.nonce &&
            Number(parsedTx.chainId) === record.chainId;
        // Note: Gas checks can be tricky due to BigInt/Decimal conversion and potential minor adjustments by wallets.
        // For strict security, we should check them, but let's ensure types match first.
        // parsedTx.gasLimit === BigInt(record.gasLimit.toFixed())

        if (!isMatch) {
            throw new BadRequestException(
                'Signed transaction details do not match the build record',
            );
        }

        // 5. Replay protection (Nonce check)
        // Check if there is any other SUBMITTED/CONFIRMED transaction with the same nonce for this address
        const conflictingTx = await this.database.offlineTransaction.findFirst({
            where: {
                from: record.from,
                nonce: record.nonce,
                status: {
                    in: [OfflineTransactionStatus.SUBMITTED, OfflineTransactionStatus.CONFIRMED],
                },
                id: { not: record.id },
            },
        });

        if (conflictingTx) {
            throw new ConflictException(
                `Nonce ${record.nonce} has already been used by another transaction`,
            );
        }

        // 6. Broadcast transaction
        const provider = this.getProvider();
        let txResponse: TransactionResponse;
        try {
            txResponse = await provider.broadcastTransaction(dto.signedTx);
        } catch (error) {
            this.handleTransferError(error);
            throw error; // handleTransferError might throw, but if not
        }

        // 7. Update record
        await this.database.offlineTransaction.update({
            where: { id: record.id },
            data: {
                status: OfflineTransactionStatus.SUBMITTED,
                signedTx: dto.signedTx,
                txHash: txResponse.hash,
            },
        });

        return {
            transactionId: record.transactionId,
            txHash: txResponse.hash,
            status: OfflineTransactionStatus.SUBMITTED,
        };
    }
}
