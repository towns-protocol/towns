## Merkle Worker

This worker is used to generate a merkle tree from a list of addresses and amounts
and proofs of a merkle tree given a merkle root.

### Test Worker

```bash
yarn dev:local

#
yarn test
```

### Generate Merkle Root Locally

```bash
yarn generate-merkle src/scripts/test_input.json

[
  {
    address: '0x1234567890123456789012345678901234567890',
    amount: '1000000000000000000'
  },
  {
    address: '0x2345678901234567890123456789012345678901',
    amount: '2500000000000000000'
  },
  {
    address: '0x3456789012345678901234567890123456789012',
    amount: '3300000000000000000'
  },
  {
    address: '0x4567890123456789012345678901234567890123',
    amount: '4100000000000000000'
  },
  {
    address: '0x5678901234567890123456789012345678901234',
    amount: '5000000000000000000'
  }
]
Merkle root generated successfully: 0xe96b72feb993a4e9c25627c3877fd6a5de92cc433a07cd3d78b300f575010281
Output written to: src/scripts/test_input_root.json
```

### Generate Merkle Root for a conditionId and claims data from json file

```bash
curl -X POST https://merkle-worker-gamma.river.build/admin/api/merkle-root \
-H "Content-Type: application/json" \
-H "Authorization: Bearer <auth-token>" \
-d @test/test_claims.json
{"success":true,"message":"Merkle root created","data":{"merkleRoot":"0x06028f518ff47e4036429a43da76984e20b22e636a26e0cc4cf4163ce1a6f67c"}
```

### Generate Merkle Proof for a conditionId, merkleRoot, and claim

```bash
curl -X POST https://merkle-worker-gamma.river.build/api/merkle-proof \
-H "Content-Type: application/json" \
-H "Authorization: Bearer <auth-token>" \
-d @test/proof_request.json
{"success":true,"message":"Proof generated successfully","data":{"proof":["0x75baf803174bc1d7cd68c1b72a46ad1920ffb468474d889fdac80a75a7ff86f5"],"leaf":["0x1234567890123456789012345678901234567890","1000000000000000000"]}
```
