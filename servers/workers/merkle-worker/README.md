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

### Generate Merkle Proof Locally

```bash
yarn generate-merkle-proof ./src/scripts/alpha_condition_id_1.json "0x5E38d087315217D5E1791553D8C3101A820C7E40" "1000000000000000000"
Merkle proof generated successfully for address: 0x5E38d087315217D5E1791553D8C3101A820C7E40
Output written to: src/scripts/alpha_condition_id_1_proof_0x5E38d087315217D5E1791553D8C3101A820C7E40.json
```

### Verify Merkle Proof Locally

```bash
yarn verify-merkle-proof --proof-file ./src/scripts/alpha_condition_id_1_proof_0x5E38d087315217D5E1791553D8C3101A820C7E40.json

✅ Merkle proof is valid
```

### Generate Merkle Root for a conditionId and claims data from json file

```bash
curl -X POST https://merkle-worker-alpha.river.build/admin/api/merkle-root \
-H "Content-Type: application/json" \
-H "Authorization: Bearer <admin-auth-token>" \
-d @src/conditions/alpha_condition_id_1.json
{"success":true,"message":"Merkle root created","merkleRoot":"0xbde37a356ea58bca4b7623130086f06c7adce874cf8504121823b31f268d7e95"}
```

### Generate Merkle Proof for a conditionId, merkleRoot, and claim

```bash
curl -X POST https://merkle-worker-alpha.river.build/api/merkle-proof \
-H "Content-Type: application/json" \
-H "Authorization: Bearer <auth-token>" \
-d @test/proof_request_alpha_1.json
{"success":true,"message":"Proof generated successfully","proof":["0x8893303e567aefe4a4442b858c71feb8b796bb81667e3e45de7ab8eb2229bdb3","0xf3a1fd950f1ce22098bf82228c022dc15d17ab3e86776dcc2c662d4dd3760ce8"],"leaf":["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266","1000000000000000000"]}
```

### Verify Merkle Proof

```bash
curl -X POST https://merkle-worker-alpha.river.build/api/verify-proof \
-H "Content-Type: application/json" \
-H "Authorization: Bearer <auth-token>" \
-d @test/proof_alpha_1.json
{"success":true,"message":"Proof verified successfully","verified":true}
```
