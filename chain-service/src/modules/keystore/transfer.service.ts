import { Injectable, NotFoundException } from '@nestjs/common';
import { ethers } from 'ethers';
import { KeyStoreService } from './keystore.service';
import { TransferDto } from './dtos/transfer.dto';

@Injectable()
export class TransferService {
    constructor(private readonly keyStoreService: KeyStoreService) {}

    private getProvider() {
        const url = process.env.ETH_RPC_URL || 'http://127.0.0.1:8545';
        const provider = new ethers.providers.JsonRpcProvider(url, Number(process.env.CHAIN_ID || 31337));
        return provider;
    }

    async sendNative(userId: string, dto: TransferDto) {
        const fromRec = await this.keyStoreService.getSecretByUserId(userId);
        const wallet = new ethers.Wallet(fromRec.privateKey, this.getProvider());
        const tx = {
            to: dto.to,
            value: ethers.BigNumber.from(dto.amount),
            gasLimit: dto.gasLimit ? ethers.BigNumber.from(dto.gasLimit) : undefined,
        } as any;

        const resp = await wallet.sendTransaction(tx);
        return resp;
    }

    async sendErc20(userId: string, dto: TransferDto) {
        if (!dto.token) throw new NotFoundException('Token contract not provided');

        const fromRec = await this.keyStoreService.getSecretByUserId(userId);
        const provider = this.getProvider();
        const wallet = new ethers.Wallet(fromRec.privateKey, provider);
        const abi = ['function transfer(address to, uint256 amount) public returns (bool)'];
        const contract = new ethers.Contract(dto.token, abi, wallet);
        const tx = await contract.transfer(dto.to, dto.amount);
        return tx;
    }
}
