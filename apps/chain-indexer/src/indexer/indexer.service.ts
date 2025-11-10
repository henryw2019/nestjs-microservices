import { Injectable, OnModuleInit } from '@nestjs/common';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma.service';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.docker') });
// 加载genesis分配
function loadGenesisAlloc(): Record<string, any> {
    const genesisPath = process.env.GENESIS_JSON_PATH;
    if (!genesisPath || !fs.existsSync(genesisPath)) return {};
    try {
        const raw = fs.readFileSync(genesisPath, 'utf8');
        const parsed = JSON.parse(raw);
        return parsed.alloc || {};
    } catch (e) {
        console.error('Failed to load genesis.json', e);
        return {};
    }
}

type PrismaClientLike = any;
type EventMatcher = { iface: ethers.Interface; fragment: any; signature: string };
const TRANSFER_EVENT_SIG = ethers.id('Transfer(address,address,uint256)');
const TRANSFER_EVENT_IFACE = new ethers.Interface([
    'event Transfer(address indexed from, address indexed to, uint256 value)',
]);
const BALANCE_OF_IFACE = new ethers.Interface([
    'function balanceOf(address) view returns (uint256)',
]);
const UPGRADED_EVENT_SIG = ethers.id('Upgraded(address)');
@Injectable()
export class IndexerService implements OnModuleInit {
    private provider: ethers.JsonRpcProvider;
    // cache of ethers.Interface instances by lowercase address
    private abiCache: Map<string, ethers.Interface> = new Map();
    // global map from event topic (topic0) -> array of interfaces that contain that event
    private topicEventIndex: Map<string, Array<EventMatcher>> = new Map();
    // all interfaces preloaded from abis/ (files not necessarily named by address)
    private preloadedIfaces: Set<ethers.Interface> = new Set();
    // cache proxy -> implementation mapping with timestamp
    private proxyImplCache: Map<string, { impl: string; ts: number }> = new Map();
    private readonly proxyImplCacheTTL = 1000 * 60 * 60 * 24; // 24 hours
    private pollInterval = parseInt(process.env.POLL_INTERVAL_MS || '5000', 10);
    private batchSize = parseInt(process.env.BATCH_SIZE || '1', 10);
    private transactionTimeout = parseInt(process.env.TRANSACTION_TIMEOUT_MS || '30000', 10);

    constructor(private readonly prisma: PrismaService) {
        const rpc = process.env.ETH_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY';
        this.provider = new ethers.JsonRpcProvider(rpc);
    }

    // Normalize a single decoded arg value for JSON storage
    private normalizeArgValue(val: any): any {
        if (val === null || typeof val === 'undefined') return null;
        if (typeof val === 'bigint') return val.toString();
        if (Array.isArray(val)) return val.map(v => this.normalizeArgValue(v));
        // ethers returns some specialized objects; coerce to string if not primitive
        const t = typeof val;
        if (t === 'object') {
            try {
                if (val && typeof val.toString === 'function') return val.toString();
            } catch (e) {
                return String(val);
            }
        }
        return val;
    }

    private sortObjectKeys(obj: any): any {
        if (!obj || typeof obj !== 'object') return obj;
        const out: any = {};
        for (const k of Object.keys(obj).sort()) out[k] = obj[k];
        return out;
    }

    // Attempt decode using topic-based candidates (preloaded topicEventIndex)
    private decodeLogWithTopic(log: any): {
        name?: string;
        fragment?: any;
        args?: any;
        signature?: string;
        iface?: ethers.Interface;
    } | null {
        const topic0 = (log && log.topics && log.topics[0]) || '';
        if (!topic0) return null;
        const candidates =
            this.topicEventIndex.get(topic0) ||
            this.topicEventIndex.get(String(topic0).toLowerCase()) ||
            [];
        for (const cand of candidates) {
            try {
                const parsed = cand.iface.parseLog(log);
                const parsedAny: any = parsed as any;
                return {
                    name: parsedAny.name,
                    fragment: parsedAny.fragment || parsedAny.eventFragment,
                    args: parsedAny.args,
                    signature: cand.signature,
                    iface: cand.iface,
                };
            } catch (e) {
                try {
                    const decoded = cand.iface.decodeEventLog(
                        cand.fragment,
                        log.data ?? '0x',
                        log.topics ?? [],
                    );
                    return {
                        name: cand.fragment?.name || cand.signature.split('(')[0] || '',
                        fragment: cand.fragment,
                        args: decoded,
                        signature: cand.signature,
                        iface: cand.iface,
                    };
                } catch (err) {
                    // continue to next candidate
                }
            }
        }
        return null;
    }

    // keep interface -> event fragment mapping keyed by topic0 so we can decode logs without address-specific ABI files
    private registerInterfaceEvents(iface: ethers.Interface) {
        if (!iface) return;
        try {
            const events = ((iface as any).fragments || []).filter(
                (fragment: any) => fragment && fragment.type === 'event',
            );
            for (const fragment of events) {
                const f: any = fragment;
                const sig = `${f.name}(${(f.inputs || []).map((i: any) => i.type).join(',')})`;
                const topic = ethers.id(sig);
                const resolvedFragment =
                    typeof (iface as any).getEvent === 'function'
                        ? (iface as any).getEvent(sig)
                        : f;
                const arr = this.topicEventIndex.get(topic) || [];
                const already = arr.some(entry => entry.signature === sig && entry.iface === iface);
                if (!already) arr.push({ iface, fragment: resolvedFragment, signature: sig });
                this.topicEventIndex.set(topic, arr);
            }
        } catch (e) {
            // ignore interface event registration errors
        }
    }

    // ensure token metadata (name,symbol,decimals,totalSupply) is present in TokenMeta table
    private async ensureTokenMeta(tokenAddress: string, client: PrismaClientLike = this.prisma) {
        if (!tokenAddress) return;
        const addr = tokenAddress.toLowerCase();
        try {
            // perform low-level calls to read common ERC20 metadata
            const iface = new ethers.Interface([
                'function name() view returns (string)',
                'function symbol() view returns (string)',
                'function decimals() view returns (uint8)',
                'function totalSupply() view returns (uint256)',
            ]);
            const out: { name?: string; symbol?: string; decimals?: number; totalSupply?: string } =
                {};
            // helper to call and decode
            const tryCall = async (fn: string, args: any[] = []) => {
                try {
                    const data = iface.encodeFunctionData(fn, args);
                    const res = await this.provider
                        .call({ to: tokenAddress, data })
                        .catch(() => null);
                    if (res && res !== '0x') {
                        const decoded = iface.decodeFunctionResult(fn, res);
                        return decoded && decoded[0];
                    }
                } catch (e) {
                    // ignore
                }
                return null;
            };
            const name = await tryCall('name');
            const symbol = await tryCall('symbol');
            const decimals = await tryCall('decimals');
            const totalSupply = await tryCall('totalSupply');
            if (name !== null && name !== undefined)
                out.name = typeof name === 'string' ? name : name.toString();
            if (symbol !== null && symbol !== undefined)
                out.symbol = typeof symbol === 'string' ? symbol : symbol.toString();
            if (typeof decimals === 'bigint' || typeof decimals === 'number')
                out.decimals = Number(decimals);
            if (totalSupply !== null && totalSupply !== undefined) {
                out.totalSupply =
                    totalSupply && totalSupply.toString
                        ? totalSupply.toString()
                        : String(totalSupply);
            }

            // upsert into TokenMeta
            await client.tokenMeta
                .upsert({
                    where: { tokenAddress: addr },
                    create: {
                        tokenAddress: addr,
                        name: out.name ?? null,
                        symbol: out.symbol ?? null,
                        decimals: out.decimals ?? null,
                        totalSupply: out.totalSupply ?? null,
                    },
                    update: {
                        name: out.name !== undefined ? out.name : undefined,
                        symbol: out.symbol !== undefined ? out.symbol : undefined,
                        decimals: out.decimals !== undefined ? out.decimals : undefined,
                        totalSupply: out.totalSupply !== undefined ? out.totalSupply : undefined,
                        lastUpdatedAt: new Date(),
                    },
                })
                .catch(e => console.error('Prisma tokenMeta upsert error', e));
        } catch (e) {
            console.error('ensureTokenMeta general error', e?.message || e);
        }
    }

    async onModuleInit() {
        // preload ABIs into topic index for faster event matching
        try {
            await this.preloadAbis();
        } catch (e) {
            console.error('preloadAbis error', e?.message || e);
        }

        // 1. 导入genesis分配，写入0区块Tx
        await this.importGenesisAlloc();

        this.startLoop();
    }

    // 导入genesis分配，写入0区块Tx
    private async importGenesisAlloc() {
        const alloc = loadGenesisAlloc();
        if (!alloc || Object.keys(alloc).length === 0) return;
        const block0Time = new Date(0); // 可根据genesis.json调整
        for (const [address, info] of Object.entries(alloc)) {
            const ethWei = info.balance ? BigInt(info.balance) : 0n;
            // Tx表插入genesis分配记录
            await (this.prisma.client.tx as any).upsert({
                where: { hash: `genesis-${address}` },
                create: {
                    hash: `genesis-${address}`,
                    blockNumber: BigInt(0),
                    from: '',
                    to: address,
                    value: ethWei.toString(),
                    gasUsed: null,
                    gasFee: null,
                    balanceAfter: ethWei.toString(),
                    nonce: null,
                    input: null,
                    status: 1,
                    timestamp: block0Time,
                } as any,
                update: {} as any,
            });
            // AddressBalance表插入ETH余额
            const exist = await this.prisma.client.addressBalance.findFirst({
                where: { address, tokenAddress: null },
            });
            if (!exist) {
                await this.prisma.client.addressBalance.create({
                    data: { address, tokenAddress: null, balance: ethWei.toString() },
                });
            }
        }
    }

    // preload ABI files from common folders into topic index
    private async preloadAbis(): Promise<void> {
        const dirs = [
            path.join(process.cwd(), 'abis'),
            path.join(process.cwd(), 'chain-indexer', 'abis'),
        ];
        // helper: recursively walk directory and process .json files
        const processJsonFile = (fullPath: string, fileName: string) => {
            try {
                const raw = fs.readFileSync(fullPath, 'utf8');
                const parsed = JSON.parse(raw);
                const abi = Array.isArray(parsed)
                    ? parsed
                    : parsed.abi && Array.isArray(parsed.abi)
                      ? parsed.abi
                      : null;
                if (!abi) return;
                const iface = new ethers.Interface(abi);
                this.registerInterfaceEvents(iface);

                // remember this iface in preloadedIfaces so it's available even if file isn't address-named
                this.preloadedIfaces.add(iface);

                // also cache by filename-derived address if file name matches address format
                const base = path.basename(fileName, '.json');
                if (/^0x[0-9a-fA-F]{40}$/.test(base)) {
                    this.abiCache.set(base.toLowerCase(), iface);
                }
            } catch (e) {
                // ignore per-file errors
            }
        };

        const walkDir = (dirPath: string) => {
            if (!fs.existsSync(dirPath)) return;
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            for (const entry of entries) {
                const full = path.join(dirPath, entry.name);
                if (entry.isDirectory()) {
                    walkDir(full);
                } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
                    processJsonFile(full, entry.name);
                }
            }
        };

        for (const dir of dirs) {
            try {
                walkDir(dir);
            } catch (e) {
                // ignore folder errors
            }
        }
        console.log(`preloadAbis: topic index contains ${this.topicEventIndex.size} topics`);
        // after preloading, dump the indexed event signatures and their topic0 hashes for inspection
        try {
            this.dumpIndexedEvents();
        } catch (e) {
            console.error('dumpIndexedEvents error', e?.message || e);
        }
    }

    // Print all preloaded event signatures and their topic0 hash to console for verification
    private dumpIndexedEvents() {
        const seen = new Set<string>();
        console.log(
            `dumpIndexedEvents: preloaded interfaces=${this.preloadedIfaces.size}, topic keys=${this.topicEventIndex.size}`,
        );
        for (const [topic, entries] of this.topicEventIndex.entries()) {
            for (const entry of entries) {
                const key = `${topic}::${entry.signature}`;
                if (seen.has(key)) continue;
                seen.add(key);
                console.log(`  ${entry.signature} -> ${topic}`);
            }
        }
        console.log(`dumpIndexedEvents: printed ${seen.size} unique events`);
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
        let checkpoint = await this.prisma.client.checkpoint.findUnique({ where: { id: 1 } });
        if (!checkpoint) {
            // initialize to -1 so the first processed block is 0 (start = lastProcessedBlock + 1)
            const initBlock = BigInt(-1);
            console.log(
                `No checkpoint found, initializing to ${String(initBlock)} to start from block 0`,
            );
            checkpoint = await this.prisma.client.checkpoint.create({
                data: {
                    id: 1,
                    chainId: parseInt(process.env.CHAIN_ID || '1', 10),
                    lastProcessedBlock: initBlock,
                },
            });
        }
        const start = Number(checkpoint.lastProcessedBlock) + 1;
        if (start > latest) return;
        const end = Math.min(latest, start + this.batchSize - 1);
        console.log(`Processing blocks ${start}..${end}`);
        for (let n = start; n <= end; n++) {
            const block = await this.provider.getBlock(n);
            if (!block) continue;
            await this.handleBlock(block);
        }
    }

    private async handleBlock(block: any) {
        const blockNumber = Number(block.number);
        console.log(`[block ${blockNumber}] start processing`);

        const hex = ethers.toBeHex(block.number);
        const blockWithTxs = await this.provider
            .send('eth_getBlockByNumber', [hex, true])
            .catch(() => null);
        if (!blockWithTxs || !blockWithTxs.transactions) {
            console.log(`[block ${blockNumber}] no transactions returned from RPC`);
            return;
        }

        const transactions = blockWithTxs.transactions as any[];
        console.log(`[block ${blockNumber}] fetched ${transactions.length} transactions`);

        await this.prisma.client.$transaction(
            async trx => {
                await trx.block.upsert({
                    where: { number: BigInt(block.number) },
                    create: {
                        number: BigInt(block.number),
                        hash: block.hash,
                        timestamp: new Date((block.timestamp || 0) * 1000),
                    },
                    update: {
                        hash: block.hash,
                        timestamp: new Date((block.timestamp || 0) * 1000),
                    },
                });

                for (let txIndex = 0; txIndex < transactions.length; txIndex += 1) {
                    const tx = transactions[txIndex];
                    console.log(
                        `[block ${blockNumber}] tx ${txIndex + 1}/${transactions.length} hash=${tx.hash}`,
                    );

                    let valueStr = '0';
                    try {
                        if (!tx.value) valueStr = '0';
                        else if (typeof tx.value === 'string' && tx.value.startsWith('0x'))
                            valueStr = BigInt(tx.value).toString();
                        else valueStr = tx.value.toString();
                    } catch (err) {
                        console.error(`[block ${blockNumber}] value normalization error`, err);
                        valueStr = '0';
                    }

                    // 先获取receipt再计算gas与其它字段
                    const receipt = await this.provider
                        .getTransactionReceipt(tx.hash)
                        .catch(() => null);

                    // 获取gasUsed/gasFee，兼容ethers v6和v5返回类型
                    let gasUsed = null,
                        gasFee = null;
                    if (receipt) {
                        let _gasUsed: any = receipt.gasUsed;
                        let _gasPrice: any = receipt.effectiveGasPrice ?? receipt.gasPrice;
                        if (_gasUsed !== undefined && _gasUsed !== null) {
                            if (typeof _gasUsed === 'string') _gasUsed = BigInt(_gasUsed);
                            if (typeof _gasUsed === 'number') _gasUsed = BigInt(_gasUsed);
                            if (typeof _gasUsed === 'bigint') gasUsed = _gasUsed; // keep BigInt for Prisma BigInt field
                        }
                        if (
                            _gasUsed !== undefined &&
                            _gasUsed !== null &&
                            _gasPrice !== undefined &&
                            _gasPrice !== null
                        ) {
                            if (typeof _gasPrice === 'string') _gasPrice = BigInt(_gasPrice);
                            if (typeof _gasPrice === 'number') _gasPrice = BigInt(_gasPrice);
                            if (typeof _gasUsed === 'bigint' && typeof _gasPrice === 'bigint') {
                                gasFee = (_gasUsed * _gasPrice).toString();
                            }
                        }
                    }

                    // 获取from地址交易后ETH余额
                    let balanceAfter = null;
                    if (tx.from) {
                        try {
                            const bal = await this.provider.getBalance(tx.from, block.number);
                            balanceAfter = bal ? bal.toString() : null;
                        } catch (e) {
                            console.error('getBalance error', e?.message || e);
                        }
                    }

                    // 获取nonce、input、status、timestamp
                    let nonce: number | null = null;
                    try {
                        if (tx.nonce !== undefined && tx.nonce !== null) {
                            if (typeof tx.nonce === 'string') {
                                if (
                                    tx.nonce.startsWith &&
                                    (tx.nonce.startsWith('0x') || tx.nonce.startsWith('0X'))
                                ) {
                                    nonce = Number(BigInt(tx.nonce));
                                } else {
                                    const parsed = Number(tx.nonce);
                                    nonce = Number.isFinite(parsed) ? parsed : null;
                                }
                            } else if (typeof tx.nonce === 'number') {
                                nonce = tx.nonce;
                            } else if (typeof tx.nonce === 'bigint') {
                                nonce = Number(tx.nonce);
                            }
                        }
                    } catch (e) {
                        nonce = null;
                    }
                    const input = tx.input || null;
                    const status =
                        receipt && typeof receipt.status !== 'undefined'
                            ? Number(receipt.status)
                            : null;
                    const timestamp = block.timestamp ? new Date(block.timestamp * 1000) : null;

                    console.log('[Tx写入]', {
                        hash: tx.hash,
                        blockNumber: BigInt(block.number),
                        from: tx.from || '',
                        to: tx.to || '',
                        value: valueStr,
                        gasUsed,
                        gasFee,
                        balanceAfter,
                        nonce,
                        input,
                        status,
                        timestamp,
                    });
                    await (trx.tx as any).upsert({
                        where: { hash: tx.hash },
                        create: {
                            hash: tx.hash,
                            blockNumber: BigInt(block.number),
                            from: tx.from || '',
                            to: tx.to || '',
                            value: valueStr,
                            gasUsed,
                            gasFee,
                            balanceAfter,
                            nonce,
                            input,
                            status,
                            timestamp,
                        } as any,
                        update: {
                            blockNumber: BigInt(block.number),
                            from: tx.from || '',
                            to: tx.to || '',
                            value: valueStr,
                            gasUsed,
                            gasFee,
                            balanceAfter,
                            nonce,
                            input,
                            status,
                            timestamp,
                        } as any,
                    });

                    if (!receipt) {
                        console.log(`[block ${blockNumber}] receipt missing for ${tx.hash}`);
                        continue;
                    }

                    if (receipt.contractAddress) {
                        try {
                            await this.ensureTokenMeta(receipt.contractAddress, trx);
                        } catch (e) {
                            console.error(
                                `[block ${blockNumber}] ensureTokenMeta contract creation error`,
                                e?.message || e,
                            );
                        }
                    }

                    const logs = receipt.logs || [];
                    console.log(
                        `[block ${blockNumber}] tx ${tx.hash} status=${receipt.status} logs=${logs.length}`,
                    );

                    const addressesToRefresh: Array<{ address: string; token?: string | null }> =
                        [];

                    for (let logIdx = 0; logIdx < logs.length; logIdx += 1) {
                        const log = logs[logIdx];
                        console.log(
                            `[block ${blockNumber}] tx ${tx.hash} log ${logIdx + 1}/${logs.length} addr=${log.address}`,
                        );

                        const rawLogIndex = log.logIndex ?? log.index;
                        let logIndexNum =
                            typeof rawLogIndex !== 'undefined' ? Number(rawLogIndex) : NaN;
                        if (Number.isNaN(logIndexNum)) logIndexNum = 0;

                        const contractAddress = (log.address || '').toLowerCase();
                        const ifaceFromAbi = await this.loadInterfaceForAddress(
                            contractAddress,
                            trx,
                        ).catch(() => null);

                        const addressesBefore = addressesToRefresh.length;
                        let parsedEventName = '';
                        let parsedIndexedArgs: any = {};
                        let parsedDataArgs: any = {};
                        const eventSignature = (log.topics && log.topics[0]) || '';
                        let transferHandled = false;
                        let matchedSignature: string | null = null;

                        // detect proxy upgrades to refresh implementation metadata
                        try {
                            if (
                                log.topics &&
                                log.topics[0] === UPGRADED_EVENT_SIG &&
                                log.topics[1]
                            ) {
                                const impl = ethers.getAddress('0x' + log.topics[1].slice(-40));
                                await this.ensureTokenMeta(impl, trx);
                                console.log(
                                    `      Detected Upgraded event for proxy=${contractAddress} impl=${impl}`,
                                );
                            }
                        } catch (e) {
                            console.log(
                                `      proxy upgrade parse error for tx=${tx.hash}: ${e?.message || e}`,
                            );
                        }

                        const recordTransfer = async (from: string, to: string, value: string) => {
                            console.log(
                                `      ERC20 Transfer token=${log.address} from=${from} to=${to} value=${value}`,
                            );
                            // 获取ERC20转账发生时的链上时间
                            const txTimestamp = block.timestamp
                                ? new Date(block.timestamp * 1000)
                                : null;
                            console.log('[ERC20Transfer写入]', {
                                txHash: tx.hash,
                                logIndex: logIndexNum,
                                blockNumber: BigInt(block.number),
                                token: log.address,
                                from,
                                to,
                                value,
                                timestamp: txTimestamp,
                            });
                            await (trx.eRC20Transfer as any).create({
                                data: {
                                    txHash: tx.hash,
                                    logIndex: logIndexNum,
                                    blockNumber: BigInt(block.number),
                                    token: log.address,
                                    from,
                                    to,
                                    value,
                                    timestamp: txTimestamp,
                                } as any,
                            });
                            // 3. 如from/to无ETH余额记录，尝试从链上刷新其ETH余额并写入（失败时回退为0）
                            for (const addr of [from, to]) {
                                if (!addr) continue;
                                const exist = await trx.addressBalance.findFirst({
                                    where: { address: addr, tokenAddress: null },
                                });
                                if (!exist) {
                                    try {
                                        const balRes = await this.provider
                                            .getBalance(addr)
                                            .catch(() => null);
                                        const balStr = balRes
                                            ? typeof balRes === 'bigint'
                                                ? balRes.toString()
                                                : BigInt(balRes.toString()).toString()
                                            : '0';
                                        await trx.addressBalance.create({
                                            data: {
                                                address: addr,
                                                tokenAddress: null,
                                                balance: balStr,
                                            },
                                        });
                                    } catch (e) {
                                        // fallback: create zero balance record if provider call fails
                                        try {
                                            await trx.addressBalance.create({
                                                data: {
                                                    address: addr,
                                                    tokenAddress: null,
                                                    balance: '0',
                                                },
                                            });
                                        } catch (err) {
                                            console.error(
                                                'failed to create fallback AddressBalance',
                                                addr,
                                                err?.message || err,
                                            );
                                        }
                                    }
                                }
                            }
                            if (from)
                                addressesToRefresh.push({ address: from, token: log.address });
                            if (to) addressesToRefresh.push({ address: to, token: log.address });
                            try {
                                await this.ensureTokenMeta(log.address, trx);
                            } catch (e) {
                                console.error('ensureTokenMeta error', e?.message || e);
                            }
                        };

                        let parsedFromAbi: ethers.LogDescription | null = null;
                        if (ifaceFromAbi) {
                            try {
                                parsedFromAbi = ifaceFromAbi.parseLog(log);
                            } catch (e) {
                                console.log(
                                    `      parse error via ABI for log index=${logIndexNum} tx=${tx.hash}: ${e?.message || e}`,
                                );
                            }
                        }

                        // fallback: if address-based parse failed, try topic-based index
                        if (!parsedFromAbi && eventSignature) {
                            const decodedCandidate = this.decodeLogWithTopic(log);
                            if (decodedCandidate) {
                                parsedFromAbi = {
                                    args: decodedCandidate.args,
                                    fragment: decodedCandidate.fragment,
                                    name: decodedCandidate.name,
                                } as any;
                                matchedSignature = decodedCandidate.signature || null;
                                try {
                                    if (decodedCandidate.iface)
                                        this.abiCache.set(contractAddress, decodedCandidate.iface);
                                } catch (e) {
                                    // ignore cache set errors
                                }
                            }
                        }

                        if (parsedFromAbi) {
                            const fragment = (parsedFromAbi as any).fragment;
                            const fallbackName =
                                parsedFromAbi.name ||
                                fragment?.name ||
                                (matchedSignature ? matchedSignature.split('(')[0] : '') ||
                                parsedEventName;
                            parsedEventName = fallbackName || '';
                            const indexedObj: any = {};
                            const dataObj: any = {};
                            // ethers LogDescription usually contains a fragment/eventFragment describing inputs and indexed flags
                            const frag: any =
                                (parsedFromAbi as any).fragment ||
                                (parsedFromAbi as any).eventFragment ||
                                null;
                            if (frag && Array.isArray(frag.inputs)) {
                                for (let i = 0; i < frag.inputs.length; i++) {
                                    const input = frag.inputs[i];
                                    const name = input.name || String(i);
                                    // prefer named access, fallback to numeric index
                                    const val =
                                        parsedFromAbi.args && parsedFromAbi.args[name] !== undefined
                                            ? parsedFromAbi.args[name]
                                            : parsedFromAbi.args[i];
                                    const outVal = this.normalizeArgValue(val);
                                    if (input.indexed) indexedObj[name] = outVal;
                                    else dataObj[name] = outVal;
                                }
                            } else {
                                // fallback: put all named args into dataObj
                                for (const key of Object.keys(parsedFromAbi.args || {})) {
                                    if (/^\d+$/.test(key)) continue;
                                    const val = parsedFromAbi.args[key];
                                    dataObj[key] = val && val.toString ? val.toString() : val;
                                }
                            }
                            // normalize and sort keys for consistent storage
                            parsedIndexedArgs = this.sortObjectKeys(
                                Object.fromEntries(
                                    Object.entries(indexedObj).map(([k, v]) => [k, v]),
                                ),
                            );
                            parsedDataArgs = this.sortObjectKeys(
                                Object.fromEntries(Object.entries(dataObj).map(([k, v]) => [k, v])),
                            );

                            if (eventSignature === TRANSFER_EVENT_SIG && parsedFromAbi.args) {
                                transferHandled = true;
                                const from = parsedFromAbi.args[0] || parsedFromAbi.args['from'];
                                const to = parsedFromAbi.args[1] || parsedFromAbi.args['to'];
                                const rawVal = parsedFromAbi.args[2] || parsedFromAbi.args['value'];
                                const value =
                                    rawVal && rawVal.toString
                                        ? rawVal.toString()
                                        : rawVal
                                          ? String(rawVal)
                                          : '0';
                                await recordTransfer(from, to, value);
                                parsedIndexedArgs = { from, to };
                                parsedDataArgs = { value };
                            }
                        }

                        if (!transferHandled && eventSignature === TRANSFER_EVENT_SIG) {
                            let parsedTransfer: ethers.LogDescription | null = null;
                            try {
                                parsedTransfer = TRANSFER_EVENT_IFACE.parseLog(log);
                            } catch (e) {
                                console.log(
                                    `      fallback transfer parse error for tx=${tx.hash}: ${e?.message || e}`,
                                );
                            }

                            if (parsedTransfer) {
                                const from = parsedTransfer.args[0];
                                const to = parsedTransfer.args[1];
                                const value = parsedTransfer.args[2].toString();
                                parsedEventName =
                                    parsedEventName || parsedTransfer.name || 'Transfer';
                                parsedIndexedArgs = { from, to };
                                parsedDataArgs = { value };
                                await recordTransfer(from, to, value);
                                transferHandled = true;
                            }
                        }

                        const eventTimestamp = block.timestamp
                            ? new Date(block.timestamp * 1000)
                            : null;
                        console.log('[EventLog写入]', {
                            chainId: parseInt(process.env.CHAIN_ID || '1', 10),
                            blockNumber: BigInt(block.number),
                            blockHash: block.hash,
                            txHash: tx.hash,
                            logIndex: logIndexNum,
                            contractAddress: log.address,
                            eventName: parsedEventName,
                            eventSignature,
                            indexedArgs: parsedIndexedArgs,
                            dataArgs: parsedDataArgs,
                            processed: false,
                            timestamp: eventTimestamp,
                        });
                        await (trx.eventLog as any).create({
                            data: {
                                chainId: parseInt(process.env.CHAIN_ID || '1', 10),
                                blockNumber: BigInt(block.number),
                                blockHash: block.hash,
                                txHash: tx.hash,
                                logIndex: logIndexNum,
                                contractAddress: log.address,
                                eventName: parsedEventName,
                                eventSignature,
                                indexedArgs: parsedIndexedArgs,
                                dataArgs: parsedDataArgs,
                                raw: log,
                                processed: false,
                                timestamp: eventTimestamp,
                            } as any,
                        });

                        if (tx.from) addressesToRefresh.push({ address: tx.from, token: null });
                        if (tx.to) addressesToRefresh.push({ address: tx.to, token: null });

                        console.log(
                            `      log ${logIdx + 1}/${logs.length} queued ${addressesToRefresh.length - addressesBefore} balance refresh entries`,
                        );
                    }

                    if (addressesToRefresh.length > 0) {
                        console.log(
                            `[block ${blockNumber}] refreshing ${addressesToRefresh.length} balance targets for tx ${tx.hash}`,
                        );
                        await this.refreshBalances(addressesToRefresh, trx);
                        addressesToRefresh.length = 0;
                    }
                }

                await trx.checkpoint.update({
                    where: { id: 1 },
                    data: { lastProcessedBlock: BigInt(block.number) },
                });
            },
            {
                timeout: this.transactionTimeout,
            },
        );

        console.log(`[block ${blockNumber}] finished processing`);
    }

    // Fetch balances (ETH or ERC20) and upsert into AddressBalance table.
    private async refreshBalances(
        items: Array<{ address: string; token?: string | null }>,
        client: PrismaClientLike = this.prisma,
    ) {
        // dedupe
        const uniq = new Map<string, { address: string; token?: string | null }>();
        for (const it of items) {
            if (!it || !it.address) continue;
            const key = `${it.address.toLowerCase()}::${it.token || ''}`;
            if (!uniq.has(key)) uniq.set(key, { address: it.address, token: it.token });
        }
        console.log(`refreshBalances: will refresh ${uniq.size} entries`);
        for (const { address, token } of uniq.values()) {
            console.log(' refreshBalances item:', { address, token });
            try {
                if (token) {
                    // ERC20 balanceOf via low-level call
                    const data = BALANCE_OF_IFACE.encodeFunctionData('balanceOf', [address]);
                    const res = await this.provider.call({ to: token, data }).catch(() => null);
                    const bal = res ? ethers.toBigInt(res) : 0n;
                    const balStr = bal.toString();
                    // find existing
                    const existing = await client.addressBalance.findFirst({
                        where: { address: address, tokenAddress: token },
                    });
                    if (existing) {
                        await client.addressBalance.update({
                            where: { id: existing.id },
                            data: { balance: balStr, lastUpdatedAt: new Date() },
                        });
                        console.log('  updated AddressBalance', {
                            address,
                            token,
                            balance: balStr,
                        });
                    } else {
                        await client.addressBalance.create({
                            data: { address: address, tokenAddress: token, balance: balStr },
                        });
                        console.log('  created AddressBalance', {
                            address,
                            token,
                            balance: balStr,
                        });
                    }
                } else {
                    // ETH balance
                    const res = await this.provider.getBalance(address).catch(() => null);
                    const bal = res ? (typeof res === 'bigint' ? res : BigInt(res.toString())) : 0n;
                    const balStr = bal.toString();
                    const existing = await client.addressBalance.findFirst({
                        where: { address: address, tokenAddress: null },
                    });
                    if (existing) {
                        await client.addressBalance.update({
                            where: { id: existing.id },
                            data: { balance: balStr, lastUpdatedAt: new Date() },
                        });
                        console.log('  updated AddressBalance', {
                            address,
                            token: null,
                            balance: balStr,
                        });
                    } else {
                        await client.addressBalance.create({
                            data: { address: address, tokenAddress: null, balance: balStr },
                        });
                        console.log('  created AddressBalance', {
                            address,
                            token: null,
                            balance: balStr,
                        });
                    }
                }
            } catch (e) {
                console.error('refreshBalances item error', address, token, e?.message || e);
            }
        }
    }

    // load an ethers.Interface for a deployed contract address if a local ABI file exists
    private async loadInterfaceForAddress(
        address: string,
        client: PrismaClientLike = this.prisma,
    ): Promise<ethers.Interface | null> {
        if (!address) return null;
        if (this.abiCache.has(address)) return this.abiCache.get(address) || null;
        try {
            const abiPath = path.join(process.cwd(), 'abis', `${address}.json`);
            if (!fs.existsSync(abiPath)) {
                // try resolving implementation if this address is a proxy
                try {
                    const impl = await this.resolveImplementation(address, client).catch(
                        () => null,
                    );
                    if (impl) {
                        const implPath = path.join(
                            process.cwd(),
                            'chain-indexer',
                            'abis',
                            `${impl.toLowerCase()}.json`,
                        );
                        if (fs.existsSync(implPath)) {
                            const raw2 = fs.readFileSync(implPath, 'utf8');
                            const parsed2 = JSON.parse(raw2);
                            const abi2 = Array.isArray(parsed2)
                                ? parsed2
                                : parsed2.abi && Array.isArray(parsed2.abi)
                                  ? parsed2.abi
                                  : null;
                            if (abi2) {
                                const iface2 = new ethers.Interface(abi2);
                                this.abiCache.set(address, iface2); // cache under original address for convenience
                                this.abiCache.set(impl.toLowerCase(), iface2);
                                this.registerInterfaceEvents(iface2);
                                console.log(
                                    `Loaded ABI for implementation ${impl} (proxy ${address}) from ${implPath}`,
                                );
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
            const abi = Array.isArray(parsed)
                ? parsed
                : parsed.abi && Array.isArray(parsed.abi)
                  ? parsed.abi
                  : null;
            if (!abi) {
                console.error(`ABI file ${abiPath} does not contain a valid ABI array`);
                return null;
            }
            const iface = new ethers.Interface(abi);
            this.abiCache.set(address, iface);
            console.log(`Loaded ABI for ${address} from ${abiPath}`);
            this.registerInterfaceEvents(iface);
            return iface;
        } catch (e) {
            console.error('loadInterfaceForAddress error', e?.message || e);
            return null;
        }
    }

    // resolve implementation address for a proxy (EIP-1967, getters, minimal proxy)
    private async resolveImplementation(
        proxyAddr: string,
        client: PrismaClientLike = this.prisma,
    ): Promise<string | null> {
        if (!proxyAddr) return null;
        const key = proxyAddr.toLowerCase();
        // check cache
        const cached = this.proxyImplCache.get(key);
        if (cached && Date.now() - cached.ts < this.proxyImplCacheTTL) return cached.impl;

        try {
            // EIP-1967 implementation slot
            const EIP1967_IMPLEMENTATION_SLOT =
                '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
            const storage = await this.provider
                .getStorage(proxyAddr, EIP1967_IMPLEMENTATION_SLOT)
                .catch(() => null);
            if (storage && /^0x0*$/.test(storage) === false) {
                const impl = ethers.getAddress('0x' + storage.slice(-40));
                if (impl && impl !== '0x0000000000000000000000000000000000000000') {
                    this.proxyImplCache.set(key, { impl, ts: Date.now() });
                    console.log(
                        `resolveImplementation: found impl ${impl} for proxy ${proxyAddr} via EIP-1967 slot`,
                    );
                    try {
                        await this.ensureTokenMeta(impl, client).catch(() => null);
                    } catch (e) {
                        // ignore
                    }
                    return impl;
                }
            }
        } catch (e) {
            // ignore and continue
        }

        // try common getter function selectors
        const getters = [
            'implementation()',
            'getImplementation()',
            'proxyImplementation()',
            'implementationAddress()',
            '_implementation()',
        ];
        for (const sig of getters) {
            try {
                const selector = ethers.id(sig).slice(0, 10);
                const res = await this.provider
                    .call({ to: proxyAddr, data: selector })
                    .catch(() => null);
                if (res && res !== '0x') {
                    const impl = ethers.getAddress('0x' + res.slice(-40));
                    if (impl && impl !== '0x0000000000000000000000000000000000000000') {
                        this.proxyImplCache.set(key, { impl, ts: Date.now() });
                        console.log(
                            `resolveImplementation: found impl ${impl} for proxy ${proxyAddr} via getter ${sig}`,
                        );
                        try {
                            await this.ensureTokenMeta(impl, client).catch(() => null);
                        } catch (e) {
                            // ignore
                        }
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
                        console.log(
                            `resolveImplementation: found impl ${impl} for proxy ${proxyAddr} via minimal-proxy bytecode`,
                        );
                        try {
                            await this.ensureTokenMeta(impl, client).catch(() => null);
                        } catch (e) {
                            // ignore
                        }
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
