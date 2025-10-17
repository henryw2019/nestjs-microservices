#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { ethers } = require('ethers');

const prisma = new PrismaClient();

async function loadAbiInterface(address) {
  if (!address) return null;
  const addr = address.toLowerCase();
  const abiPath = path.join(process.cwd(), 'abis', `${addr}.json`);
  if (!fs.existsSync(abiPath)) return null;
  try {
    const raw = fs.readFileSync(abiPath, 'utf8');
    const parsed = JSON.parse(raw);
    const abi = Array.isArray(parsed) ? parsed : (parsed.abi && Array.isArray(parsed.abi) ? parsed.abi : null);
    if (!abi) return null;
    const iface = new ethers.Interface(abi);
    return iface;
  } catch (e) {
    console.error('loadAbiInterface error', e.message || e);
    return null;
  }
}

function normalizeParsedArgs(parsed) {
  const outIndexed = {};
  const outData = {};
  if (!parsed || !parsed.args) return { indexed: outIndexed, data: outData };
  for (const k of Object.keys(parsed.args)) {
    if (/^\d+$/.test(k)) continue; // skip numeric keys
    const v = parsed.args[k];
    // convert BigNumber/BigInt to string
    if (typeof v === 'bigint') {
      outData[k] = v.toString();
    } else if (ethers.BigNumber && ethers.BigNumber.isBigNumber && ethers.BigNumber.isBigNumber(v)) {
      outData[k] = v.toString();
    } else if (v && typeof v === 'object' && v.toString) {
      outData[k] = v.toString();
    } else {
      outData[k] = v;
    }
  }
  return { indexed: outIndexed, data: outData };
}

async function main() {
  console.log('Starting EventLog backfill using local ABIs...');
  const BATCH = 200;
  let totalUpdated = 0;
  let totalScanned = 0;
  // process in loops until none left
  while (true) {
    // eventName is non-nullable in Prisma schema, so search for empty string
    const rows = await prisma.eventLog.findMany({ where: { eventName: '' }, take: BATCH, orderBy: { id: 'asc' } });
    if (!rows || rows.length === 0) break;
    totalScanned += rows.length;
    for (const r of rows) {
      const id = r.id;
      const ca = (r.contractAddress || '').toLowerCase();
      const raw = r.raw || r.raw || null;
      let updated = false;
      try {
        const iface = await loadAbiInterface(ca);
        if (iface && raw) {
          try {
            const parsed = iface.parseLog(raw);
            const { indexed, data } = normalizeParsedArgs(parsed);
            const name = parsed && parsed.name ? parsed.name : '';
            await prisma.eventLog.update({ where: { id }, data: { eventName: name, indexedArgs: indexed, dataArgs: data } });
            totalUpdated++;
            updated = true;
            console.log(`Updated id=${id} addr=${ca} -> ${name}`);
          } catch (e) {
            // parse failed for this ABI; just skip
            // console.log(`parse failed id=${id} addr=${ca}: ${e.message}`);
          }
        }
      } catch (e) {
        console.error('error processing row', id, e.message || e);
      }
      if (!updated) {
        // try fallback for Transfer signature if not already
        try {
          if (raw && raw.topics && raw.topics[0] === ethers.id('Transfer(address,address,uint256)')) {
            const fallbackIface = new ethers.Interface(['event Transfer(address indexed from, address indexed to, uint256 value)']);
            const parsed = fallbackIface.parseLog(raw);
            const { indexed, data } = normalizeParsedArgs(parsed);
            const name = parsed && parsed.name ? parsed.name : 'Transfer';
            await prisma.eventLog.update({ where: { id }, data: { eventName: name, indexedArgs: { from: parsed.args[0], to: parsed.args[1] }, dataArgs: { value: parsed.args[2].toString() } } });
            totalUpdated++;
            console.log(`Fallback Updated id=${id} addr=${ca} -> ${name}`);
            updated = true;
          }
        } catch (e) {
          // ignore
        }
      }
    }
    // small pause
    await new Promise(r => setTimeout(r, 200));
  }
  console.log(`Done. scanned=${totalScanned} updated=${totalUpdated}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error('Fatal error', e); process.exit(1); });
