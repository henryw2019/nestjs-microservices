#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const usage = () => {
  console.error('Usage: node scripts/list-abi-functions.js <path-to-abi.json>');
  process.exit(1);
};

const input = process.argv[2];
if (!input) usage();

const fullPath = path.resolve(process.cwd(), input);
let fileContent;
try {
  fileContent = fs.readFileSync(fullPath, 'utf8');
} catch (err) {
  console.error(`Failed to read file: ${fullPath}`);
  console.error(err.message || err);
  process.exit(1);
}

let parsed;
try {
  parsed = JSON.parse(fileContent);
} catch (err) {
  console.error('File is not valid JSON');
  console.error(err.message || err);
  process.exit(1);
}

const abi = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.abi) ? parsed.abi : null);
if (!abi) {
  console.error('No ABI array found in the supplied file');
  process.exit(1);
}

const functions = abi.filter(entry => entry && entry.type === 'function');
if (!functions.length) {
  console.log('No callable functions found in ABI.');
  process.exit(0);
}

const formatParam = (param, index) => {
  if (!param) return `unknown arg${index}`;
  const type = param.type || 'unknown';
  const name = param.name && param.name.trim() ? param.name : `arg${index}`;
  return `${type} ${name}`.trim();
};

const formatIO = (items = []) => {
  if (!items.length) return '    (none)';
  return items
    .map((item, idx) => {
      const type = item?.type || 'unknown';
      const name = item && item.name && item.name.trim() ? item.name : `result${idx}`;
      return `    - ${type}${name ? ' ' + name : ''}`;
    })
    .join('\n');
};

functions.forEach((fn, index) => {
  const signature = `${fn.name || '(anonymous)'}(${(fn.inputs || []).map((param, idx) => formatParam(param, idx)).join(', ')})`;
  console.log(`${index + 1}. ${signature}`);
  console.log(`   stateMutability: ${fn.stateMutability || 'unspecified'}`);
  if (fn.payable) console.log('   payable: true');
  if (fn.constant) console.log('   constant: true');
  console.log('   inputs:');
  console.log(formatIO(fn.inputs));
  console.log('   outputs:');
  console.log(formatIO(fn.outputs));
  console.log('');
});
