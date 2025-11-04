const fs = require('fs');
const path = require('path');
const { id } = require('ethers');

function walkDir(dir, cb) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDir(full, cb);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) cb(full, entry.name);
  }
}

const abisDir = path.join(process.cwd(), 'chain-indexer', 'abis');
const out = [];
walkDir(abisDir, (full, name) => {
  try {
    const raw = fs.readFileSync(full, 'utf8');
    const parsed = JSON.parse(raw);
    const abi = Array.isArray(parsed) ? parsed : (parsed.abi && Array.isArray(parsed.abi) ? parsed.abi : null);
    if (!abi) return;
    for (const item of abi) {
      if (item.type === 'event') {
        const sig = `${item.name}(${(item.inputs || []).map(i => i.type).join(',')})`;
        const topic = id(sig);
        out.push({ file: full.replace(process.cwd(), ''), event: sig, topic });
      }
    }
  } catch (e) {
    // ignore
  }
});

console.log(`Found ${out.length} events in ${abisDir}`);
for (const o of out) {
  console.log(o.file, ' -> ', o.event, ' -> ', o.topic);
}
