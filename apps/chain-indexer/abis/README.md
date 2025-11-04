Place contract ABI JSON files here, named by the contract address (lowercase), e.g.

- abis/0xabc123...def.json

When an ABI file exists for a contract address, the indexer will load it and use it to decode event logs and fill EventLog.eventName, indexedArgs and dataArgs.

Format:
- Standard JSON ABI array as produced by Solidity compiler or Etherscan.

Notes:
- For public contracts you can paste the ABI file here manually or download from Etherscan.
- If no local ABI is found, the indexer will fall back to hardcoded standard events (e.g. ERC20 Transfer).