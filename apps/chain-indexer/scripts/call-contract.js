#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const parseArgs = argv => {
  const result = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        result[key] = true;
      } else {
        result[key] = next;
        i += 1;
      }
    } else {
      result._.push(token);
    }
  }
  return result;
};

const usage = () => {
  console.log(`Usage:
  node scripts/call-contract.js --abi <abi.json> --address <contract> --fn <functionName> [--args '["arg1","arg2"]'] \
    [--rpc <rpcUrl>] [--private-key <hexKey>] [--value <ether>] [--send]

Flags:
  --abi           Path to ABI JSON file (array or { abi: [...] }).
  --address       Contract address to call.
  --fn            Function name (supports overloaded signature "foo(uint256)").
  --args          Optional JSON array of arguments. Comma string fallback if JSON parse fails.
  --rpc           RPC URL (default: ETH_RPC_URL env or http://127.0.0.1:8545).
  --private-key   Hex private key (required when sending state-changing tx).
  --value         Optional ETH value to send (only when --send).
  --send          Execute a state-changing transaction (default is read-only call).
  --help          Show this message.
`);
};

(async () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    process.exit(0);
  }

  const abiPath = args.abi;
  const contractAddress = args.address;
  const functionNameInput = args.fn;

  if (!abiPath || !contractAddress || !functionNameInput) {
    console.error('Missing required arguments.');
    usage();
    process.exit(1);
  }

  const rpcUrl = args.rpc || process.env.ETH_RPC_URL || 'http://127.0.0.1:8545';

  let abiContent;
  try {
    abiContent = fs.readFileSync(path.resolve(process.cwd(), abiPath), 'utf8');
  } catch (err) {
    console.error(`Failed to read ABI file: ${abiPath}`);
    console.error(err.message || err);
    process.exit(1);
  }

  let abiJson;
  try {
    abiJson = JSON.parse(abiContent);
  } catch (err) {
    console.error('ABI file is not valid JSON.');
    console.error(err.message || err);
    process.exit(1);
  }

  const abi = Array.isArray(abiJson) ? abiJson : (abiJson && Array.isArray(abiJson.abi) ? abiJson.abi : null);
  if (!abi) {
    console.error('ABI data not found in provided file.');
    process.exit(1);
  }

  let fnArgs = [];
  if (args.args) {
    try {
      const parsedArgs = JSON.parse(args.args);
      if (!Array.isArray(parsedArgs)) throw new Error('args JSON must be an array');
      fnArgs = parsedArgs;
    } catch (err) {
      fnArgs = args.args.split(',').map(v => v.trim()).filter(Boolean);
    }
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  let signer = null;
  if (args.send) {
    const pk = args['private-key'] || process.env.PRIVATE_KEY;
    if (!pk) {
      console.error('A private key is required to send transactions. Provide --private-key or set PRIVATE_KEY env.');
      process.exit(1);
    }
    try {
      signer = new ethers.Wallet(pk, provider);
    } catch (err) {
      console.error('Invalid private key.');
      console.error(err.message || err);
      process.exit(1);
    }
  }

  const contract = new ethers.Contract(contractAddress, abi, signer || provider);

  const iface = new ethers.Interface(abi);
  let fragment;
  try {
    fragment = iface.getFunction(functionNameInput);
  } catch (err) {
    // attempt fallback for bare name when overloaded
    const candidates = abi.filter(item => item.type === 'function' && item.name === functionNameInput);
    if (candidates.length === 1) {
      fragment = iface.getFunction(`${functionNameInput}(${candidates[0].inputs.map(i => i.type).join(',')})`);
    } else {
      console.error(`Function ${functionNameInput} not found in ABI.`);
      process.exit(1);
    }
  }

  if (fragment.inputs.length !== fnArgs.length) {
    console.error(`Argument mismatch: function expects ${fragment.inputs.length} parameter(s) but got ${fnArgs.length}.`);
    console.error(`Expected types: ${fragment.inputs.map(i => i.type).join(', ')}`);
    process.exit(1);
  }

  // attempt to coerce numeric-like strings into BigInt where appropriate
  const coercedArgs = fragment.inputs.map((input, idx) => {
    const raw = fnArgs[idx];
    if (raw === null || typeof raw === 'undefined') return raw;
    if (typeof raw === 'string') {
      if (/^0x[0-9a-fA-F]+$/.test(raw)) {
        return raw; // hex string
      }
      if (/^\d+$/.test(raw) && /(u?int\d*)$/.test(input.type)) {
        try {
          return BigInt(raw);
        } catch (e) {
          return raw;
        }
      }
    }
    return raw;
  });

  const isReadOnly = fragment.stateMutability === 'view' || fragment.stateMutability === 'pure';

  try {
    if (!args.send || isReadOnly) {
      if (args.send && !isReadOnly) {
        console.warn('Warning: --send was provided, but function is read-only. Performing call instead.');
      }
      const result = await contract[fragment.name](...coercedArgs);
      console.log('Call result:', result);
    } else {
      const options = {};
      if (args.value) {
        try {
          options.value = ethers.parseEther(args.value);
        } catch (err) {
          console.error('Failed to parse --value as ETH. Provide numeric string, e.g., "0.01"');
          process.exit(1);
        }
      }
      console.log('Sending transaction...');
      const txResponse = await contract[fragment.name](...coercedArgs, options);
      console.log('Transaction hash:', txResponse.hash);
      const receipt = await txResponse.wait();
      console.log('Transaction mined in block', receipt.blockNumber);
      console.log('Status:', receipt.status);
    }
  } catch (err) {
    console.error('Contract call failed.');
    console.error(err?.reason || err?.message || err);
    if (err?.error?.message) console.error('Inner error:', err.error.message);
    process.exit(1);
  }
})();
