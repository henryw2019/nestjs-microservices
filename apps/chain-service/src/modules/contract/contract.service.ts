import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { join, resolve, isAbsolute } from 'path';
import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { Contract as ContractModel } from '@prisma/client';
import { ethers } from 'ethers';

import { DatabaseService } from '@/common/services/database.service';
import { KeyStoreService } from '@/modules/keystore/keystore.service';
import { CreateContractDto, AbiInput } from './dtos/create-contract.dto';
import { UpdateContractDto } from './dtos/update-contract.dto';
import { ExecuteContractFunctionDto } from './dtos/execute-contract-function.dto';
import { ContractResponseDto } from './dtos/contract-response.dto';

interface ContractExecutionReadResult {
    type: 'read';
    functionName: string;
    result: unknown;
}

interface ContractExecutionWriteResult {
    type: 'write';
    functionName: string;
    transaction: Record<string, unknown>;
    receipt?: Record<string, unknown>;
}

export type ContractExecutionResult = ContractExecutionReadResult | ContractExecutionWriteResult;

@Injectable()
export class ContractService {
    private readonly logger = new Logger(ContractService.name);

    constructor(
        private readonly database: DatabaseService,
        private readonly keyStoreService: KeyStoreService,
    ) {}

    async create(dto: CreateContractDto): Promise<ContractResponseDto> {
    const id = randomUUID();
        const normalizedAddress = this.normalizeAddress(dto.address);
        await this.assertContractUniqueness(normalizedAddress);

        const abiFilename = await this.persistAbi(id, dto.abi);

        const contract = await this.database.contract.create({
            data: {
                id,
                name: dto.name.trim(),
                address: normalizedAddress,
                abiFile: abiFilename,
                ownerId: dto.ownerId ?? null,
            },
        });

        this.logger.log(`Registered contract ${contract.name} at ${contract.address}`);
        return this.toResponse(contract);
    }

    async findAll(): Promise<ContractResponseDto[]> {
        const contracts = await this.database.contract.findMany({
            orderBy: { createdAt: 'desc' },
        });

        return contracts.map(contract => this.toResponse(contract));
    }

    async findOne(id: string, withAbi = false): Promise<ContractResponseDto> {
        const contract = await this.getContractOrThrow(id);
        if (!withAbi) {
            return this.toResponse(contract);
        }

        const abi = await this.loadAbi(contract.abiFile);
        return this.toResponse(contract, abi);
    }

    async update(id: string, dto: UpdateContractDto): Promise<ContractResponseDto> {
        const contract = await this.getContractOrThrow(id);

        const updatePayload: Record<string, unknown> = {};

        if (dto.name) {
            updatePayload.name = dto.name.trim();
        }

        if (dto.address) {
            const normalizedAddress = this.normalizeAddress(dto.address);
            if (normalizedAddress !== contract.address) {
                await this.assertContractUniqueness(normalizedAddress, contract.id);
            }
            updatePayload.address = normalizedAddress;
        }

        if (dto.ownerId !== undefined) {
            updatePayload.ownerId = dto.ownerId ?? null;
        }

        if (dto.abi) {
            await this.persistAbi(contract.id, dto.abi, contract.abiFile);
        }

        if (Object.keys(updatePayload).length) {
            await this.database.contract.update({
                where: { id: contract.id },
                data: updatePayload,
            });
        }

        const refreshed = await this.getContractOrThrow(contract.id);
        return this.toResponse(refreshed, dto.abi ? await this.loadAbi(refreshed.abiFile) : undefined);
    }

    async remove(id: string): Promise<void> {
        const contract = await this.getContractOrThrow(id);
        await this.database.contract.delete({ where: { id } });
        await this.deleteAbi(contract.abiFile);
        this.logger.log(`Removed contract ${contract.name} (${contract.address})`);
    }

    async execute(contractId: string, dto: ExecuteContractFunctionDto): Promise<ContractExecutionResult> {
        const contract = await this.getContractOrThrow(contractId);
        const abi = await this.loadAbi(contract.abiFile);

        const iface = new ethers.utils.Interface(abi as any);
        let fragment: ethers.utils.FunctionFragment;
        try {
            fragment = iface.getFunction(dto.functionName);
        } catch (error) {
            throw new NotFoundException(`Function ${dto.functionName} not found in contract ABI`);
        }

        const provider = this.getProvider();
        const isReadOnly = fragment.stateMutability === 'view' || fragment.stateMutability === 'pure';
        const shouldCallStatic = dto.callStatic === true;

        if (isReadOnly || shouldCallStatic) {
            const overrides = this.buildOverrides(dto, { includeFrom: true });
            const args = this.applyOverrides(dto.params, overrides);
            const contractInstance = new ethers.Contract(contract.address, abi, provider);

            try {
                const target = shouldCallStatic ? contractInstance.callStatic : contractInstance;
                const invoker = this.resolveCallable(target, fragment);
                const result = await invoker(...args);
                return this.buildReadResult(dto.functionName, result);
            } catch (error) {
                if (error instanceof NotFoundException) {
                    throw error;
                }
                const message = this.extractErrorMessage(error);
                this.logger.error(
                    `Failed to execute read for ${dto.functionName} on ${contract.address}`,
                    error instanceof Error ? error.stack : undefined,
                );
                throw new BadRequestException(message);
            }
        }

        if (!dto.fromAddress) {
            throw new BadRequestException('fromAddress is required for state-changing functions');
        }

        const signer = await this.resolveSigner(dto.fromAddress, provider);
        const overrides = this.buildOverrides(dto);
        const args = this.applyOverrides(dto.params, overrides);
        const contractWithSigner = new ethers.Contract(contract.address, abi, signer);

        try {
            const invoker = this.resolveCallable(contractWithSigner, fragment);
            const tx = await invoker(...args);
            const response = await this.buildWriteResult(dto, tx);
            this.logger.log(`Executed ${dto.functionName} on ${contract.address}; tx hash: ${tx.hash}`);
            return response;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            const message = this.extractErrorMessage(error);
            this.logger.error(
                `Failed to execute ${dto.functionName} on ${contract.address}`,
                error instanceof Error ? error.stack : undefined,
            );
            throw new BadRequestException(message);
        }
    }

    private getAbiDirectory(): string {
        const configured = process.env.CONTRACT_ABI_DIR;
        return configured ? resolve(configured) : resolve(process.cwd(), 'storage', 'abis');
    }

    private async ensureAbiDirectory(): Promise<string> {
        const directory = this.getAbiDirectory();
        await fs.mkdir(directory, { recursive: true });
        return directory;
    }

    private async persistAbi(contractId: string, abi: AbiInput, existingFile?: string): Promise<string> {
        const directory = await this.ensureAbiDirectory();
        const filename = existingFile ?? `${contractId}.json`;
        const fullPath = isAbsolute(filename) ? filename : join(directory, filename);

        try {
            await fs.writeFile(fullPath, JSON.stringify(abi, null, 2), 'utf8');
        } catch (error) {
            this.logger.error('Failed to persist ABI file', error as Error);
            throw new InternalServerErrorException('Failed to persist ABI file');
        }

    return filename;
    }

    private async loadAbi(filename: string): Promise<AbiInput> {
        const directory = await this.ensureAbiDirectory();
        const fullPath = isAbsolute(filename) ? filename : join(directory, filename);

        try {
            const content = await fs.readFile(fullPath, 'utf8');
            const parsed = JSON.parse(content);
            if (!Array.isArray(parsed)) {
                throw new Error('ABI file does not contain an array');
            }
            return parsed as AbiInput;
        } catch (error) {
            this.logger.error('Failed to read ABI file', error as Error);
            throw new InternalServerErrorException('Failed to read ABI definition');
        }
    }

    private async deleteAbi(filename: string): Promise<void> {
        const directory = await this.ensureAbiDirectory();
        const fullPath = isAbsolute(filename) ? filename : join(directory, filename);

        try {
            await fs.unlink(fullPath);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return;
            }
            this.logger.warn(`Failed to delete ABI file at ${fullPath}`, error as Error);
        }
    }

    private toResponse(contract: ContractModel, abi?: AbiInput): ContractResponseDto {
        return {
            id: contract.id,
            name: contract.name,
            address: contract.address,
            ownerId: contract.ownerId,
            createdAt: contract.createdAt,
            ...(abi ? { abi } : {}),
        };
    }

    private async getContractOrThrow(id: string): Promise<ContractModel> {
        const contract = await this.database.contract.findUnique({ where: { id } });
        if (!contract) {
            throw new NotFoundException('Contract not found');
        }
        return contract;
    }

    private async assertContractUniqueness(address: string, currentId?: string): Promise<void> {
        const existing = await this.database.contract.findFirst({ where: { address } });
        if (existing && existing.id !== currentId) {
            throw new BadRequestException('A contract with this address is already registered');
        }
    }

    private normalizeAddress(address: string): string {
        try {
            return ethers.utils.getAddress(address);
        } catch (error) {
            throw new BadRequestException('Invalid Ethereum address');
        }
    }

    private getProvider(): ethers.providers.JsonRpcProvider {
        const url = process.env.ETH_RPC_URL || 'http://127.0.0.1:8545';
        const chainId = Number(process.env.CHAIN_ID || 31337);
        return new ethers.providers.JsonRpcProvider(url, chainId);
    }

    private async resolveSigner(address: string, provider: ethers.providers.Provider) {
        const normalized = this.normalizeAddress(address);
        const record = await this.keyStoreService.getByAddress(normalized);
        return new ethers.Wallet(record.privateKey, provider);
    }

    private resolveCallable(
        container: Record<string, unknown>,
        fragment: ethers.utils.FunctionFragment,
    ): (...args: unknown[]) => Promise<any> {
        const candidates = [
            fragment.format(ethers.utils.FormatTypes.full),
            fragment.format(ethers.utils.FormatTypes.minimal),
            fragment.name,
        ];

        for (const key of candidates) {
            const candidate = container[key];
            if (typeof candidate === 'function') {
                return candidate.bind(container);
            }
        }

        throw new NotFoundException(`Unable to resolve callable for function ${fragment.name}`);
    }

    private buildOverrides(
        dto: ExecuteContractFunctionDto,
        options: { includeFrom?: boolean } = {},
    ): Record<string, unknown> {
        const overrides: Record<string, unknown> = {};

        if (dto.gasLimit) {
            overrides.gasLimit = this.toBigNumber(dto.gasLimit, 'gasLimit');
        }

        if (dto.gasPrice) {
            overrides.gasPrice = this.toBigNumber(dto.gasPrice, 'gasPrice');
        }

        if (dto.value) {
            overrides.value = this.toBigNumber(dto.value, 'value');
        }

        if (dto.nonce) {
            const nonceValue = ethers.BigNumber.from(dto.nonce);
            const nonceNumber = nonceValue.toNumber();
            if (!Number.isSafeInteger(nonceNumber)) {
                throw new BadRequestException('Nonce must be within the safe integer range');
            }
            overrides.nonce = nonceNumber;
        }

        if (options.includeFrom && dto.fromAddress) {
            overrides.from = this.normalizeAddress(dto.fromAddress);
        }

        return overrides;
    }

    private applyOverrides(params: unknown[], overrides: Record<string, unknown>): unknown[] {
        if (!params?.length && !Object.keys(overrides).length) {
            return [];
        }

        const args = Array.isArray(params) ? [...params] : [];
        if (Object.keys(overrides).length) {
            args.push(overrides);
        }
        return args;
    }

    private async buildWriteResult(
        dto: ExecuteContractFunctionDto,
        tx: ethers.ContractTransaction,
    ): Promise<ContractExecutionWriteResult> {
        const transaction = {
            hash: tx.hash,
            from: tx.from,
            to: tx.to ?? undefined,
            nonce: tx.nonce,
            gasLimit: tx.gasLimit ? tx.gasLimit.toString() : undefined,
            gasPrice: tx.gasPrice ? tx.gasPrice.toString() : undefined,
            data: tx.data,
            value: tx.value ? tx.value.toString() : undefined,
            chainId: typeof tx.chainId === 'number' ? tx.chainId : Number(process.env.CHAIN_ID || 0),
        };

        if (!dto.waitForConfirmation) {
            return {
                type: 'write',
                functionName: dto.functionName,
                transaction,
            };
        }

        const receipt = await tx.wait();
        return {
            type: 'write',
            functionName: dto.functionName,
            transaction,
            receipt: this.normalizeReceipt(receipt),
        };
    }

    private buildReadResult(functionName: string, payload: unknown): ContractExecutionReadResult {
        return {
            type: 'read',
            functionName,
            result: this.normalizeResult(payload),
        };
    }

    private normalizeResult(value: unknown): unknown {
        if (Array.isArray(value)) {
            return value.map(item => this.normalizeResult(item));
        }

        if (ethers.BigNumber.isBigNumber(value)) {
            return value.toString();
        }

        if (value && typeof value === 'object') {
            const result: Record<string, unknown> = {};
            for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
                if (!Number.isNaN(Number(key))) {
                    continue;
                }
                result[key] = this.normalizeResult(val);
            }
            return result;
        }

        return value;
    }

    private normalizeReceipt(receipt: ethers.ContractReceipt): Record<string, unknown> {
        return {
            transactionHash: receipt.transactionHash,
            blockHash: receipt.blockHash,
            blockNumber: receipt.blockNumber,
            from: receipt.from,
            to: receipt.to ?? undefined,
            gasUsed: receipt.gasUsed?.toString(),
            cumulativeGasUsed: receipt.cumulativeGasUsed?.toString(),
            status: receipt.status,
            confirmations: receipt.confirmations,
            logs: receipt.logs?.map(log => ({
                address: log.address,
                data: log.data,
                topics: log.topics,
                logIndex: log.logIndex,
                blockNumber: log.blockNumber,
                transactionIndex: log.transactionIndex,
                transactionHash: log.transactionHash,
            })),
        };
    }

    private toBigNumber(value: string, field: string): ethers.BigNumber {
        try {
            return ethers.BigNumber.from(value);
        } catch (error) {
            throw new BadRequestException(`Invalid value provided for ${field}`);
        }
    }

    private extractErrorMessage(error: unknown): string {
        if (!error) {
            return 'Contract execution failed';
        }

        if (error instanceof Error) {
            return error.message;
        }

        const maybeMessage = (error as Record<string, unknown>).message;
        if (typeof maybeMessage === 'string') {
            return maybeMessage;
        }

        return 'Contract execution failed';
    }
}
