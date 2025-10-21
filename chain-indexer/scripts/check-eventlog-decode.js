#!/usr/bin/env node
/*
Simple script to: 
- preload ABIs from abis/ and chain-indexer/abis
- build topic0 -> candidate {signature, iface, fragment}
- query EventLog table (via Prisma) for recent N rows or filter
- attempt decode using the topic map
- print differences between decoded eventName/indexedArgs/dataArgs and stored ones

Usage: node scripts/check-eventlog-decode.js [--limit N] [--sample] [--only-mismatch]
*/
const fs = require('fs');
const path = require('path');
const { Interface, ethers } = require('ethers');

function loadAbis(dirs) {
  const ifaces = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    (function walk(p) {
      const entries = fs.readdirSync(p, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(p, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.isFile() && e.name.toLowerCase().endsWith('.json')) {
          try {
            const raw = fs.readFileSync(full, 'utf8');
            const parsed = JSON.parse(raw);
            const abi = Array.isArray(parsed) ? parsed : (parsed.abi && Array.isArray(parsed.abi) ? parsed.abi : null);
            if (!abi) continue;
            const iface = new Interface(abi);
            ifaces.push({ iface, file: full });
          } catch (err) {
            // ignore
          }
        }
      }
    })(dir);
  }
  return ifaces;
}

function buildTopicIndex(ifaces) {
  const map = new Map();
  for (const { iface, file } of ifaces) {
    const fragments = (iface.fragments || []).filter(f => f && f.type === 'event');
    for (const frag of fragments) {
      const sig = `${frag.name}(${(frag.inputs || []).map(i => i.type).join(',')})`;
      const topic = ethers.id(sig);
      const resolved = typeof iface.getEvent === 'function' ? iface.getEvent(sig) : frag;
      const arr = map.get(topic) || [];
      arr.push({ signature: sig, iface, fragment: resolved, file });
      map.set(topic, arr);
    }
  }
  return map;
}

function normalizeArgs(args) {
  // convert Param types and BigInt to printable strings
  if (!args) return {};
  const out = {};
  for (const k of Object.keys(args)) {
    if (/^\d+$/.test(k)) continue; // skip numeric keys
    let v = args[k];
    if (v && typeof v === 'bigint') v = v.toString();
    else if (v && v.toString && typeof v !== 'string') v = v.toString();
    out[k] = v;
  }
  return out;
}

function sortObjectKeys(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const keys = Object.keys(obj).sort();
  const out = {};
  for (const k of keys) out[k] = obj[k];
  return out;
}

function objectsEqual(a, b) {
  const sa = JSON.stringify(sortObjectKeys(a || {}));
  const sb = JSON.stringify(sortObjectKeys(b || {}));
  return sa === sb;
}

async function main() {
  const dirs = [
    path.join(process.cwd(), 'abis'),
    path.join(process.cwd(), 'chain-indexer', 'abis')
  ];
  const ifaces = loadAbis(dirs);
  const topicIndex = buildTopicIndex(ifaces);
  console.log(`Loaded ${ifaces.length} interfaces, topics=${topicIndex.size}`);

  const args = process.argv.slice(2);
  const limitArgIndex = args.indexOf('--limit');
  let limit = 50;
  if (limitArgIndex !== -1 && args[limitArgIndex + 1]) limit = parseInt(args[limitArgIndex + 1], 10);
  const onlyMismatch = args.includes('--only-mismatch');
  const sample = args.includes('--sample');
  const applyChanges = args.includes('--apply');

  // try to use prisma client if available
  let prisma = null;
  try {
    const { PrismaClient } = require('@prisma/client');
    prisma = new PrismaClient();
  } catch (e) {
    console.log('Prisma client not found in workspace. Will only decode sample logs from file.');
  }

  const rows = [];
  if (prisma) {
    console.log(`Querying last ${limit} rows from EventLog`);
    const res = await prisma.eventLog.findMany({ orderBy: { id: 'desc' }, take: limit });
    rows.push(...res.reverse());
  } else {
    console.log('No prisma, reading example sample logs from chain-indexer/scripts/sample.logs.json if present');
    try {
      const sampleFile = path.join(process.cwd(), 'scripts', 'sample.logs.json');
      if (fs.existsSync(sampleFile)) {
        const raw = fs.readFileSync(sampleFile,'utf8');
        const parsed = JSON.parse(raw);
        rows.push(...(Array.isArray(parsed)?parsed:[]));
      } else {
        console.log('No sample.logs.json found; exiting.');
        process.exit(0);
      }
    } catch (e) {
      console.error('Failed to read sample logs', e.message);
      process.exit(1);
    }
  }

  let mismatches = 0;
  for (const row of rows) {
    // row.raw should be the original log object
    const rawLog = row.raw || {};
    const topic0 = (rawLog.topics && rawLog.topics[0]) || '';
    if (!topic0) continue;
    const candidates = topicIndex.get(topic0.toLowerCase()) || topicIndex.get(topic0) || [];
    let decoded = null;
    let usedCandidate = null;

    for (const cand of candidates) {
      try {
        const parsed = cand.iface.parseLog(rawLog);
        decoded = { name: parsed.name, args: parsed.args, fragment: cand.fragment };
        usedCandidate = cand;
        break;
      } catch (e) {
        try {
          const decodedArgs = cand.iface.decodeEventLog(cand.fragment, rawLog.data || '0x', rawLog.topics || []);
          decoded = { name: cand.fragment.name || '', args: decodedArgs, fragment: cand.fragment };
          usedCandidate = cand;
          break;
        } catch (e2) {
          // continue
        }
      }
    }

    const decodedIndexed = {};
    const decodedData = {};
    if (decoded && decoded.fragment && Array.isArray(decoded.fragment.inputs)) {
      const frag = decoded.fragment;
      for (let i = 0; i < frag.inputs.length; i++) {
        const input = frag.inputs[i];
        const name = input.name || String(i);
        let val = decoded.args[name] !== undefined ? decoded.args[name] : decoded.args[i];
        if (val && typeof val === 'bigint') val = val.toString();
        else if (val && val.toString && typeof val !== 'string') val = val.toString();
        if (input.indexed) decodedIndexed[name] = val; else decodedData[name] = val;
      }
    }

    // compare with stored
    const storedIndexed = row.indexedArgs || {};
    const storedData = row.dataArgs || {};
    const storedName = row.eventName || '';

    const normDecodedIndexed = normalizeArgs(decodedIndexed);
    const normDecodedData = normalizeArgs(decodedData);

  const sameName = (!decoded || !decoded.name) ? (storedName === '' ) : (decoded.name === storedName);
  const sameIndexed = objectsEqual(normDecodedIndexed, storedIndexed);
  const sameData = objectsEqual(normDecodedData, storedData);

    const isMismatch = !(sameName && sameIndexed && sameData);
    if (onlyMismatch && !isMismatch) continue;

    if (isMismatch) {
      mismatches++;
      if (applyChanges && prisma && decoded) {
        try {
          // update eventName, indexedArgs, dataArgs
          await prisma.eventLog.update({
            where: { id: row.id },
            data: {
              eventName: decoded.name || storedName,
              indexedArgs: normDecodedIndexed,
              dataArgs: normDecodedData
            }
          });
          console.log('  Applied update to DB for row id=', row.id);
        } catch (e) {
          console.error('  Failed to apply update for row id=', row.id, e.message || e);
        }
      }
    }

    console.log('--- Row id=', row.id, 'tx=', row.txHash, 'logIndex=', row.logIndex);
    console.log('  stored eventName=', storedName);
    console.log('  decoded eventName=', decoded ? decoded.name : '<no decode>');
    console.log('  stored indexedArgs=', JSON.stringify(storedIndexed));
    console.log('  decoded indexedArgs=', JSON.stringify(normDecodedIndexed));
    console.log('  stored dataArgs=', JSON.stringify(storedData));
    console.log('  decoded dataArgs=', JSON.stringify(normDecodedData));
    if (usedCandidate) console.log('  usedCandidate=', usedCandidate.signature, 'from', usedCandidate.file);
  }

  console.log(`Completed ${rows.length} rows, mismatches=${mismatches}`);
  if (prisma) await prisma.$disconnect();
  process.exit(0);
}

main().catch(e=>{console.error('Fatal error', e); process.exit(1);});
