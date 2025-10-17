import { Injectable, OnModuleInit } from '@nestjs/common';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma.service';

@Injectable()
export class IndexerService implements OnModuleInit {
  private provider: ethers.JsonRpcProvider;
  // cache of ethers.Interface instances by lowercase address
  private abiCache: Map<string, ethers.Interface> = new Map();
  // cache proxy -> implementation mapping with timestamp
  private proxyImplCache: Map<string, { impl: string; ts: number }> = new Map();
  private readonly proxyImplCacheTTL = 1000 * 60 * 60 * 24; // 24 hours
  private pollInterval = parseInt(process.env.POLL_INTERVAL_MS || '5000', 10);
  private batchSize = parseInt(process.env.BATCH_SIZE || '1', 10);

  constructor(private readonly prisma: PrismaService) {
    const rpc = process.env.ETH_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY';
    this.provider = new ethers.JsonRpcProvider(rpc);
  }

  async onModuleInit() {
    this.startLoop();
  }

  private async startLoop() {
    console.log('Indexer loop started');
    while (true) {
      try {
        await this.processBatch();
      } catch (e: any) {
        console.error('Indexer error', e?.message || e);
      }
      await new Promise(r => setTimeout(r, this.pollInterval));
    }
  }

  private async processBatch() {
    const latest = await this.provider.getBlockNumber();
    let checkpoint = await this.prisma.checkpoint.findUnique({ where: { id: 1 } });
    if (!checkpoint) {
      // initialize to -1 so the first processed block is 0 (start = lastProcessedBlock + 1)
      const initBlock = BigInt(-1);
      console.log(`No checkpoint found, initializing to ${String(initBlock)} to start from block 0`);
      checkpoint = await this.prisma.checkpoint.create({ data: { id: 1, chainId: parseInt(process.env.CHAIN_ID || '1', 10), lastProcessedBlock: initBlock } });
    }
    let start = Number(checkpoint.lastProcessedBlock) + 1;
    if (start > latest) return;
    const end = Math.min(latest, start + this.batchSize - 1);
    console.log(`Processing blocks ${start}..${end}`);
    for (let n = start; n <= end; n++) {
      const block = await this.provider.getBlock(n);
      if (!block) continue;
      await this.handleBlock(block);
      await this.prisma.checkpoint.update({ where: { id: 1 }, data: { lastProcessedBlock: BigInt(n) } });
    }
  }

  private async handleBlock(block: any) {
  // upsert block to avoid duplicate-key errors when reprocessing historical ranges
  await this.prisma.block.upsert({ where: { number: BigInt(block.number) }, create: { number: BigInt(block.number), hash: block.hash, timestamp: new Date((block.timestamp || 0) * 1000) }, update: {} }).catch(e => console.error('Prisma block upsert error', e));
  // fetch transactions by block using JSON-RPC to ensure full tx objects
  const hex = ethers.toBeHex(block.number);
  const blockWithTxs = await this.provider.send('eth_getBlockByNumber', [hex, true]).catch(() => null);
  if (!blockWithTxs || !blockWithTxs.transactions) return;
    console.log(`Block ${block.number}: txs=${(blockWithTxs.transactions || []).length}`);
    for (const tx of blockWithTxs.transactions as any[]) {
      try {
        console.log(`  TX ${tx.hash} from=${tx.from} to=${tx.to}`);
        // normalize value to decimal string (Prisma Decimal expects base-10 string)
        let valueStr = '0';
        try {
          if (!tx.value) valueStr = '0';
          else if (typeof tx.value === 'string' && tx.value.startsWith('0x')) valueStr = BigInt(tx.value).toString();
          else valueStr = tx.value.toString();
        } catch (err) {
          console.error('value normalization error', err);
          valueStr = '0';
        }
  // upsert tx to avoid duplicate key errors
  await this.prisma.tx.upsert({ where: { hash: tx.hash }, create: { hash: tx.hash, blockNumber: BigInt(block.number), from: tx.from || '', to: tx.to || '', value: valueStr }, update: {} }).catch(e => console.error('Prisma tx upsert error', e));
        const receipt = await this.provider.getTransactionReceipt(tx.hash).catch(() => null);
        if (!receipt) {
          console.log(`    receipt missing for ${tx.hash}`);
          continue;
        }
        console.log(`    receipt status=${receipt.status} logs=${(receipt.logs||[]).length}`);
    const addressesToRefresh: Array<{ address: string; token?: string | null }> = [];
  for (const log of receipt.logs) {
          // normalize log index: different providers may return `logIndex` or `index`
          const rawLogIndex = (log as any).logIndex ?? (log as any).index;
          let logIndexNum = typeof rawLogIndex !== 'undefined' ? Number(rawLogIndex) : NaN;
          if (Number.isNaN(logIndexNum)) logIndexNum = 0;
          // prepared parsed values (if any)
          let parsedEventName = '';
          let parsedIndexedArgs: any = {};
          let parsedDataArgs: any = {};
          // try parse with local ABI cache if available
          const contractAddress = (log.address || '').toLowerCase();
          const ifaceFromAbi = await this.loadInterfaceForAddress(contractAddress).catch(() => null);
          try {
            if (ifaceFromAbi) {
              // attempt to parse using contract ABI
              const parsed = ifaceFromAbi.parseLog(log as any);
              parsedEventName = parsed.name || '';
              // split indexed vs non-indexed args by checking ABI event inputs
              const indexed: any = {};
              const dataArgs: any = {};
              // parsed.args is an array-like with both numeric and named keys; prefer named
              for (const key of Object.keys(parsed.args || {})) {
                // skip numeric keys
                if (/^\d+$/.test(key)) continue;
                const val = parsed.args[key];
                // heuristics: treat string/BigInt values plainly
                (parsed.args as any)[key];
                // we don't know indexing from parsed result here, so store all in dataArgs
                dataArgs[key] = val && val.toString ? val.toString() : val;
              }
              parsedIndexedArgs = indexed;
              parsedDataArgs = dataArgs;
            } else {
              // fallback: detect ERC20 Transfer topic
              if (log.topics && log.topics[0] === ethers.id('Transfer(address,address,uint256)')) {
                const iface = new ethers.Interface(['event Transfer(address indexed from, address indexed to, uint256 value)']);
                const parsed = iface.parseLog(log as any);
                const from = parsed.args[0];
                const to = parsed.args[1];
                const value = parsed.args[2].toString();
                parsedEventName = parsed.name || 'Transfer';
                parsedIndexedArgs = { from, to };
                parsedDataArgs = { value };
                console.log(`      ERC20 Transfer parsed token=${log.address} from=${from} to=${to} value=${value}`);
                await this.prisma.eRC20Transfer.create({ data: { txHash: tx.hash, logIndex: logIndexNum, blockNumber: BigInt(block.number), token: log.address, from, to, value } }).catch(e => console.error('Prisma erc20 create error', e));
                if (from) addressesToRefresh.push({ address: from, token: log.address });
                if (to) addressesToRefresh.push({ address: to, token: log.address });
              }
            }
          } catch (e) {
            console.log(`      parse error for log index=${log.logIndex} tx=${tx.hash}: ${e?.message || e}`);
          }
          try {
            // detect ERC20 Transfer topic and parse
            if (log.topics && log.topics[0] === ethers.id('Transfer(address,address,uint256)')) {
              const iface = new ethers.Interface(['event Transfer(address indexed from, address indexed to, uint256 value)']);
              const parsed = iface.parseLog(log as any);
              const from = parsed.args[0];
              const to = parsed.args[1];
              const value = parsed.args[2].toString();
              parsedEventName = parsed.name || 'Transfer';
              // populate indexed/data args for easier querying later
              parsedIndexedArgs = { from, to };
              parsedDataArgs = { value };
              console.log(`      ERC20 Transfer parsed token=${log.address} from=${from} to=${to} value=${value}`);
              await this.prisma.eRC20Transfer.create({ data: { txHash: tx.hash, logIndex: logIndexNum, blockNumber: BigInt(block.number), token: log.address, from, to, value } }).catch(e => console.error('Prisma erc20 create error', e));
              // queue token balance refresh for both from/to
              if (from) addressesToRefresh.push({ address: from, token: log.address });
              if (to) addressesToRefresh.push({ address: to, token: log.address });
            }
          } catch (e) {
            console.log(`      parse error for log index=${log.logIndex} tx=${tx.hash}: ${e?.message || e}`);
          }
          // write raw event log (include parsed eventName and args when available)
          await this.prisma.eventLog.create({ data: { chainId: parseInt(process.env.CHAIN_ID || '1', 10), blockNumber: BigInt(block.number), blockHash: block.hash, txHash: tx.hash, logIndex: logIndexNum, contractAddress: log.address, eventName: parsedEventName, eventSignature: (log.topics && log.topics[0]) || '', indexedArgs: parsedIndexedArgs, dataArgs: parsedDataArgs, raw: log as any, processed: false } }).catch(e => console.error('Prisma eventLog create error', e));
          // queue ETH balance refresh for tx.from and tx.to
          if (tx.from) addressesToRefresh.push({ address: tx.from, token: null });
          if (tx.to) addressesToRefresh.push({ address: tx.to, token: null });
          if (addressesToRefresh.length > 0) {
            try {
              // await to make sure balances are visible in DB for test validation
              await this.refreshBalances(addressesToRefresh);
            } catch (e) {
              console.error('balance refresh error', e?.message || e);
            }
          }
        }
      } catch (e) {
        console.log(`  error processing tx ${tx.hash}: ${e?.message || e}`);
      }
    }
    }

  // Fetch balances (ETH or ERC20) and upsert into AddressBalance table.
  private async refreshBalances(items: Array<{ address: string; token?: string | null }>) {
    // dedupe
    const uniq = new Map<string, { address: string; token?: string | null }>();
    for (const it of items) {
      if (!it || !it.address) continue;
      const key = `${it.address.toLowerCase()}::${(it.token || '')}`;
      if (!uniq.has(key)) uniq.set(key, { address: it.address, token: it.token });
    }
    console.log(`refreshBalances: will refresh ${uniq.size} entries`);
    for (const { address, token } of uniq.values()) {
      console.log(' refreshBalances item:', { address, token });
      try {
        if (token) {
          // ERC20 balanceOf via low-level call
          const iface = new ethers.Interface(['function balanceOf(address) view returns (uint256)']);
          const data = iface.encodeFunctionData('balanceOf', [address]);
          const res = await this.provider.call({ to: token, data }).catch(() => null);
          const bal = res ? ethers.toBigInt(res) : 0n;
          const balStr = bal.toString();
          // find existing
          const existing = await this.prisma.addressBalance.findFirst({ where: { address: address, tokenAddress: token } });
          if (existing) {
            await this.prisma.addressBalance.update({ where: { id: existing.id }, data: { balance: balStr, lastUpdatedAt: new Date() } });
            console.log('  updated AddressBalance', { address, token, balance: balStr });
          } else {
            await this.prisma.addressBalance.create({ data: { address: address, tokenAddress: token, balance: balStr } });
            console.log('  created AddressBalance', { address, token, balance: balStr });
          }
        } else {
          // ETH balance
          const res = await this.provider.getBalance(address).catch(() => null);
          const bal = res ? (typeof res === 'bigint' ? res : BigInt(res.toString())) : 0n;
          const balStr = bal.toString();
          const existing = await this.prisma.addressBalance.findFirst({ where: { address: address, tokenAddress: null } });
          if (existing) {
            await this.prisma.addressBalance.update({ where: { id: existing.id }, data: { balance: balStr, lastUpdatedAt: new Date() } });
            console.log('  updated AddressBalance', { address, token: null, balance: balStr });
          } else {
            await this.prisma.addressBalance.create({ data: { address: address, tokenAddress: null, balance: balStr } });
            console.log('  created AddressBalance', { address, token: null, balance: balStr });
          }
        }
      } catch (e) {
        console.error('refreshBalances item error', address, token, e?.message || e);
      }
    }
  }

  // load an ethers.Interface for a deployed contract address if a local ABI file exists
  private async loadInterfaceForAddress(address: string): Promise<ethers.Interface | null> {
    if (!address) return null;
    if (this.abiCache.has(address)) return this.abiCache.get(address) || null;
    try {
      const abiPath = path.join(process.cwd(), 'chain-indexer', 'abis', `${address}.json`);
      if (!fs.existsSync(abiPath)) {
        // try resolving implementation if this address is a proxy
        try {
          const impl = await this.resolveImplementation(address).catch(() => null);
          if (impl) {
            const implPath = path.join(process.cwd(), 'chain-indexer', 'abis', `${impl.toLowerCase()}.json`);
            if (fs.existsSync(implPath)) {
              const raw2 = fs.readFileSync(implPath, 'utf8');
              const parsed2 = JSON.parse(raw2);
              const abi2 = Array.isArray(parsed2) ? parsed2 : (parsed2.abi && Array.isArray(parsed2.abi) ? parsed2.abi : null);
              if (abi2) {
                const iface2 = new ethers.Interface(abi2 as any);
                this.abiCache.set(address, iface2); // cache under original address for convenience
                this.abiCache.set(impl.toLowerCase(), iface2);
                console.log(`Loaded ABI for implementation ${impl} (proxy ${address}) from ${implPath}`);
                return iface2;
              }
            }
          }
        } catch (e) {
          // ignore and continue
        }
        return null;
      }
      const raw = fs.readFileSync(abiPath, 'utf8');
      const parsed = JSON.parse(raw);
      // support two formats: raw ABI array, or hardhat/truffle artifact with { abi: [...] }
      const abi = Array.isArray(parsed) ? parsed : (parsed.abi && Array.isArray(parsed.abi) ? parsed.abi : null);
      if (!abi) {
        console.error(`ABI file ${abiPath} does not contain a valid ABI array`);
        return null;
      }
      const iface = new ethers.Interface(abi as any);
      this.abiCache.set(address, iface);
      console.log(`Loaded ABI for ${address} from ${abiPath}`);
      return iface;
    } catch (e) {
      console.error('loadInterfaceForAddress error', e?.message || e);
      return null;
    }
  }

  // resolve implementation address for a proxy (EIP-1967, getters, minimal proxy)
  private async resolveImplementation(proxyAddr: string): Promise<string | null> {
    if (!proxyAddr) return null;
    const key = proxyAddr.toLowerCase();
    // check cache
    const cached = this.proxyImplCache.get(key);
    if (cached && (Date.now() - cached.ts) < this.proxyImplCacheTTL) return cached.impl;

    try {
      // EIP-1967 implementation slot
      const EIP1967_IMPLEMENTATION_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
  const storage = await this.provider.getStorage(proxyAddr, EIP1967_IMPLEMENTATION_SLOT).catch(() => null);
      if (storage && /^0x0*$/.test(storage) === false) {
        const impl = ethers.getAddress('0x' + storage.slice(-40));
        if (impl && impl !== '0x0000000000000000000000000000000000000000') {
          this.proxyImplCache.set(key, { impl, ts: Date.now() });
          console.log(`resolveImplementation: found impl ${impl} for proxy ${proxyAddr} via EIP-1967 slot`);
          return impl;
        }
      }
    } catch (e) {
      // ignore and continue
    }

    // try common getter function selectors
    const getters = ['implementation()', 'getImplementation()', 'proxyImplementation()', 'implementationAddress()', '_implementation()'];
    for (const sig of getters) {
      try {
        const selector = ethers.id(sig).slice(0, 10);
        const res = await this.provider.call({ to: proxyAddr, data: selector }).catch(() => null);
        if (res && res !== '0x') {
          const impl = ethers.getAddress('0x' + res.slice(-40));
          if (impl && impl !== '0x0000000000000000000000000000000000000000') {
            this.proxyImplCache.set(key, { impl, ts: Date.now() });
            console.log(`resolveImplementation: found impl ${impl} for proxy ${proxyAddr} via getter ${sig}`);
            return impl;
          }
        }
      } catch (e) {
        // ignore
      }
    }

    // try minimal proxy pattern (EIP-1167) in runtime code
    try {
      const code = await this.provider.getCode(proxyAddr).catch(() => null);
      if (code && code.length > 100) {
        const lower = code.toLowerCase();
        const needle = '363d3d373d3d3d363d73';
        const idx = lower.indexOf(needle);
        if (idx !== -1) {
          const start = idx + needle.length;
          const implHex = lower.slice(start, start + 40);
          const impl = ethers.getAddress('0x' + implHex);
          if (impl) {
            this.proxyImplCache.set(key, { impl, ts: Date.now() });
            console.log(`resolveImplementation: found impl ${impl} for proxy ${proxyAddr} via minimal-proxy bytecode`);
            return impl;
          }
        }
      }
    } catch (e) {
      // ignore
    }

    // not found
    this.proxyImplCache.set(key, { impl: '', ts: Date.now() });
    return null;
  }
}