import {
    BadRequestException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { ethers } from 'ethers';
import { KeyStoreService } from './keystore.service';
import { TransferDto } from './dtos/transfer.dto';
import { TransferResponseDto } from './dtos/transfer.response.dto';

@Injectable()
export class TransferService {
    constructor(private readonly keyStoreService: KeyStoreService) {}

    private getProvider() {
        const url = process.env.ETH_RPC_URL || 'http://127.0.0.1:8545';
        const provider = new ethers.providers.JsonRpcProvider(url, Number(process.env.CHAIN_ID || 31337));
        return provider;
    }

    async sendNative(userId: string, dto: TransferDto): Promise<TransferResponseDto> {
        try {
            const fromAddress = ethers.utils.getAddress(dto.from);
            const fromRec = await this.keyStoreService.getSecretByUserIdAndAddress(userId, fromAddress);
            const provider = this.getProvider();
            const wallet = new ethers.Wallet(fromRec.privateKey, provider);
            const tx = {
                to: dto.to,
                value: ethers.BigNumber.from(dto.amount),
                gasLimit: dto.gasLimit ? ethers.BigNumber.from(dto.gasLimit) : undefined,
            } as any;

            const resp = await wallet.sendTransaction(tx);
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
            const fromAddress = ethers.utils.getAddress(dto.from);
            const fromRec = await this.keyStoreService.getSecretByUserIdAndAddress(userId, fromAddress);
            const provider = this.getProvider();
            const wallet = new ethers.Wallet(fromRec.privateKey, provider);
            const abi = ['function transfer(address to, uint256 amount) public returns (bool)'];
            const contract = new ethers.Contract(dto.token, abi, wallet);
            const tx = await contract.transfer(dto.to, dto.amount);
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
        response: ethers.providers.TransactionResponse,
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
            const { message, code } = this.extractErrorDetails(error as Record<string, any>, fallback);
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
            const messageMatchesClientIssue = /insufficient funds|gas|execution reverted|underpriced|nonce|replacement|already known|transaction|balance/i.test(
                normalizedMessage,
            );

            if (
                (typeof normalizedCode === 'string' && badRequestCodes.has(normalizedCode)) ||
                (typeof normalizedCode === 'number' && badRequestCodes.has(normalizedCode)) ||
                (normalizedCode === 'SERVER_ERROR' && messageMatchesClientIssue)
            ) {
                return new BadRequestException(normalizedMessage);
            }

            if (typeof normalizedCode === 'number' && normalizedCode >= -32099 && normalizedCode <= -32000) {
                return new BadRequestException(normalizedMessage);
            }

            if (messageMatchesClientIssue) {
                return new BadRequestException(normalizedMessage);
            }

            return new InternalServerErrorException(normalizedMessage);
        }

        return new InternalServerErrorException(fallback);
    }

    private extractErrorDetails(error: Record<string, any>, fallback: string): { message: string; code?: string | number } {
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

        const genericPatterns = [/processing response error/i, /transaction failed/i, /error sending/i];

        for (const candidate of cleanedCandidates) {
            const isGeneric = genericPatterns.some(pattern => pattern.test(candidate));
            if (!isGeneric) {
                return candidate;
            }
        }

        return cleanedCandidates[0] ?? fallback;
    }
}
