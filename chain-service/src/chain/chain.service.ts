import { Injectable } from '@nestjs/common';
import { KeyStoreService } from './keystore.service';
import { ethers } from 'ethers';

@Injectable()
export class ChainService {
  private provider: ethers.JsonRpcProvider;

  constructor(private readonly keyStore: KeyStoreService) {
    const rpc = process.env.ETH_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY';
    this.provider = new ethers.JsonRpcProvider(rpc);
  }

  async getBalance(address: string) {
    if (!address) return { error: 'address required' };
    const balance = await this.provider.getBalance(address);
    return { address, balance: ethers.formatEther(balance) };
  }

  async getTxs(address: string, limit = 10) {
    // Placeholder: full tx history requires indexing service (etherscan or own indexer)
    return { address, limit, note: 'Use an indexer (Etherscan/TheGraph/Blockscout) for full tx history' };
  }

  async getErc20Txs(address: string, tokenAddress: string) {
    // Placeholder
    return { address, tokenAddress, note: 'Use indexer or events scanning' };
  }

  async transferEth(fromPrivateKey: string, to: string, amount: string) {
    const wallet = new ethers.Wallet(fromPrivateKey, this.provider);
    const tx = await wallet.sendTransaction({ to, value: ethers.parseEther(amount) });
    return { hash: tx.hash };
  }

  // New: sign using private key on server and send (legacy/dev)
  async transferEthWithPrivateKey(fromPrivateKey: string, to: string, amount: string) {
    return this.transferEth(fromPrivateKey, to, amount);
  }

  // Send a signed raw transaction (public write endpoints should call this after verifying signature)
  async sendSignedTransaction(signedTx: string, declaredFromAddress?: string) {
    if (!signedTx) return { error: 'signedTx required' };
    // recover from signed tx to verify signer
    try {
      const tx = ethers.Transaction.from(signedTx);
      // derive sender
  const recovered = ethers.verifyTransaction(signedTx);
      const from = recovered.from as string;
      if (declaredFromAddress && declaredFromAddress.toLowerCase() !== from.toLowerCase()) {
        return { error: 'signedTx from address does not match declaredFromAddress', from };
      }
      const sent = await this.provider.sendTransaction(signedTx);
      return { hash: sent.hash, from };
    } catch (err: any) {
      return { error: err?.message || String(err) };
    }
  }

  // Custodial server-side signing using KeyStoreService
  async custodialTransferEth(ownerId: string, fromAddress: string, to: string, amount: string) {
    const pk = this.keyStore.getPrivateKeyForOwnerAddress(ownerId, fromAddress);
    if (!pk) return { error: 'private key not found for owner/address' };
    return this.transferEthWithPrivateKey(pk, to, amount);
  }

  async custodialTransferErc20(ownerId: string, fromAddress: string, to: string, amount: string, tokenAddress: string) {
    const pk = this.keyStore.getPrivateKeyForOwnerAddress(ownerId, fromAddress);
    if (!pk) return { error: 'private key not found for owner/address' };
    return this.transferErc20WithPrivateKey(pk, to, amount, tokenAddress);
  }

  async transferErc20(fromPrivateKey: string, to: string, amount: string, tokenAddress: string) {
    const wallet = new ethers.Wallet(fromPrivateKey, this.provider);
    const erc20 = new ethers.Contract(tokenAddress, [
      'function transfer(address to, uint256 amount) returns (bool)'
    ], wallet);
    const tx = await erc20.transfer(to, ethers.parseUnits(amount, 18));
    return { hash: tx.hash };
  }

  async transferErc20WithPrivateKey(fromPrivateKey: string, to: string, amount: string, tokenAddress: string) {
    return this.transferErc20(fromPrivateKey, to, amount, tokenAddress);
  }

  async mintErc20(adminPrivateKey: string, tokenAddress: string, to: string, amount: string) {
    const wallet = new ethers.Wallet(adminPrivateKey, this.provider);
    const erc20 = new ethers.Contract(tokenAddress, [
      'function mint(address to, uint256 amount)',
      'function decimals() view returns (uint8)'
    ], wallet);
    const decimals = await erc20.decimals();
    const tx = await erc20.mint(to, ethers.parseUnits(amount, decimals));
    return { hash: tx.hash };
  }

  async burnErc20(adminPrivateKey: string, tokenAddress: string, from: string, amount: string) {
    const wallet = new ethers.Wallet(adminPrivateKey, this.provider);
    const erc20 = new ethers.Contract(tokenAddress, [
      'function burn(address from, uint256 amount)',
      'function decimals() view returns (uint8)'
    ], wallet);
    const decimals = await erc20.decimals();
    const tx = await erc20.burn(from, ethers.parseUnits(amount, decimals));
    return { hash: tx.hash };
  }

  // Admin-authorized wrappers: check ADMIN_API_KEY env or require adminPrivateKey
  async mintErc20Authorized(adminApiKey: string | undefined, adminPrivateKey: string | undefined, tokenAddress?: string, to?: string, amount?: string) {
    const envKey = process.env.ADMIN_API_KEY;
    if (envKey && adminApiKey && adminApiKey === envKey) {
      if (!adminPrivateKey) return { error: 'adminPrivateKey required when broadcasting from server' };
      return this.mintErc20(adminPrivateKey, tokenAddress!, to!, amount!);
    }
    // fallback: if no env key configured, allow using provided adminPrivateKey (not recommended)
    if (adminPrivateKey) return this.mintErc20(adminPrivateKey, tokenAddress!, to!, amount!);
    return { error: 'unauthorized' };
  }

  async burnErc20Authorized(adminApiKey: string | undefined, adminPrivateKey: string | undefined, tokenAddress?: string, from?: string, amount?: string) {
    const envKey = process.env.ADMIN_API_KEY;
    if (envKey && adminApiKey && adminApiKey === envKey) {
      if (!adminPrivateKey) return { error: 'adminPrivateKey required when broadcasting from server' };
      return this.burnErc20(adminPrivateKey, tokenAddress!, from!, amount!);
    }
    if (adminPrivateKey) return this.burnErc20(adminPrivateKey, tokenAddress!, from!, amount!);
    return { error: 'unauthorized' };
  }
}
