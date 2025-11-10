Keystore / transfer module

APIs (auth required):
- POST /v1/keystore
  creates or returns the current user wallet; stores address + privateKey (plaintext) in `keystore`

- GET /v1/keystore/me
  retrieves the current user wallet metadata (sans privateKey)

- POST /v1/transfer
  body: { to, amount, token?, gasLimit? }
  if token provided performs ERC20 transfer via transfer(); otherwise native ETH send

Notes:
- Requires ethers dependency and a running JSON-RPC at ETH_RPC_URL (default http://127.0.0.1:8545)
- For development only: private keys stored in plain text
