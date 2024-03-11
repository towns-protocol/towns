# stackup-worker

Worker proxy for Stack Account Abstraction package.

## Dependencies

- Wrangler 1.17 or newer
- Node 16.13.0 or newer
- Cloudlflare API Key

Once Wrangler is installed, run `wrangler login` to login to your Cloudflare account.

To re-generate this template using Wrangler, run this command:

```bash
wrangler generate my-ts-project https://github.com/cloudflare/worker-typescript-template
```

## Development

`yarn dev:local` - run the worker directly on your local machine. Does not require wrangler creds. DOES require .dev.vars

`yarn dev` - start local dev server. requires [Wrangler](https://github.com/cloudflare/wrangler) and then `wrangler login`. will give you access to secrets stored in cloudflare so you don't need dev.vars. Double check secret variables with `wrangler secret list` after logging in

> :warning: **There are still some kinks to workout with linting**: It doesn't always come up in editor, so you may want to run `yarn lint` occasionally.

## Environment variables

Can be set in `wrangler.toml`. Secret variables can be set in `.dev.vars`.

## Testing

`yarn test` - runs a local version of cloudflare using `miniflare` (same as `yarn dev:local`). Should not require any Cloudflare credentials to run. You may need to run `yarn` first.

This template comes with jest tests utilizing [Miniflare](https://github.com/cloudflare/miniflare) which simply test that the request handler can handle each request method. `yarn test` will run your tests.

## Troubleshooting

- `wrangler secret list` - should output any secrets stored in Cloudflare
- If there's weird errors running tests, it could be caused by conflicting versions of `miniflare`. [issue](https://github.com/cloudflare/miniflare/issues/239#issuecomment-1092999752). Try `yarn why miniflare`. If there are confliciting versions and tests fail, try resolving miniflare to a single version in `harmony/packaga.json`

### Formatting

This template uses [`prettier`](https://prettier.io/) to format the project. To invoke, run `yarn format`.

### Build

```bash
yarn
```

## Deploying to Local Dev

```bash
wrangler login
yarn dev
# choose local (l)
curl http://127.0.0.1:8686/
```

### Testing from local dev with Stackup paymaster API

```bash

# ensure the following are set in .dev.vars
PAYMASTER_ADDRESS=0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
STACKUP_API_TOKEN=${YOU_API_KEY}
# if override is not for every_wallet_can_mint_town
SKIP_TOWNID_VERIFICATION=true

# in one shell
yarn dev:local

# in another shell, ask paymaster to verify userOp to create a new town
curl -X POST -H "Content-Type: application/json" -d '{"sender":"0x9a3f50137aC64cf30f22C9f517b5E63bc50d9289","nonce":"0x0","initCode":"0x9406cc6185a346906296840746125a0e449764545fbfb9cf000000000000000000000000e367e571b1322e02f104cc81894d5869d1ebe99a0000000000000000000000000000000000000000000000000000000000000000","callData":"0x18dfb3c7000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000020000000000000000000000003870419ba2bbf0127060bcb37f69a1b1c090992b0000000000000000000000003870419ba2bbf0127060bcb37f69a1b1c090992b0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000044095ea7b30000000000000000000000009a3f50137ac64cf30f22c9f517b5e63bc50d92890000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044a9059cbb0000000000000000000000009a3f50137ac64cf30f22c9f517b5e63bc50d9289000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","callGasLimit":"0x5c1b","verificationGasLimit":"0x6fc21","preVerificationGas":"0xe150","maxFeePerGas":"0x1e9c62b06b","maxPriorityFeePerGas":"0xb","paymasterAndData":"0xe93eca6595fe94091dc1af46aac2a8b5d799077000000000000000000000000000000000000000000000000000000000657932c300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000032f2dd54d441872fdab1851d367a48f9346d6d44e7021337d6b0223fe2cfce7a375a6e5269b757fcb6ac0b984c637b3a952a2e11a7af38496f70453e0f6578db1b","signature":"0x9895d0999b694aa88778e48e26d7c6ecd52228c1008f1fa01f1964f20a7511e21d9cbbd5c277d8dcd07bee2dc91e938bb7b59a35c7582a2d130d62393379727f1c","townId":"0x0","functionHash":"createSpace"}' http://127.0.0.1:8686/api/sponsor-userop

```

## Testing from local dev with SKIP_TOWNID_VERIFICATION="false"

```
# ensure the following are set in .dev.vars
PAYMASTER_ADDRESS=0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
STACKUP_API_TOKEN=${YOU_API_KEY}

# if override is not for every_wallet_can_mint_town
SKIP_TOWNID_VERIFICATION="false"

# in one shell
yarn dev:local

# add a KV override to enable all town mints unilaterally
curl -X POST -H "Content-Type: application/json" -d '{"operation":"every_wallet_can_mint_town_with_privy_user", "enabled":true}' http://127.0.0.1:8686/admin/api/add-override

# add email to whitelist
curl -X POST -H "Content-Type: application/json" -d '{"operation":"email_whitelist","data":"john@hntlabs.com","enabled":true}' http://127.0.0.1:8686/admin/api/add-to-whitelist

# remove email from whitelist
# add email to whitelist
curl -X POST -H "Content-Type: application/json" -d '{"operation":"email_whitelist","data":"john@hntlabs.com","enabled":false}' http://127.0.0.1:8686/admin/api/add-to-whitelist

# add townId to whitelist
curl -X POST -H "Content-Type: application/json" -d '{"operation":"town_id_whitelist","data":"john@hntlabs.com","enabled":true}' http://127.0.0.1:8686/admin/api/add-to-whitelist

# in another shell, ask paymaster to verify userOp to create a new town
curl -X POST -H "Content-Type: application/json" -d '{"sender":"0x9a3f50137aC64cf30f22C9f517b5E63bc50d9289","nonce":"0x0","initCode":"0x9406cc6185a346906296840746125a0e449764545fbfb9cf000000000000000000000000e367e571b1322e02f104cc81894d5869d1ebe99a0000000000000000000000000000000000000000000000000000000000000000","callData":"0x18dfb3c7000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000020000000000000000000000003870419ba2bbf0127060bcb37f69a1b1c090992b0000000000000000000000003870419ba2bbf0127060bcb37f69a1b1c090992b0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000044095ea7b30000000000000000000000009a3f50137ac64cf30f22c9f517b5e63bc50d92890000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044a9059cbb0000000000000000000000009a3f50137ac64cf30f22c9f517b5e63bc50d9289000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","callGasLimit":"0x5c1b","verificationGasLimit":"0x6fc21","preVerificationGas":"0xe150","maxFeePerGas":"0x1e9c62b06b","maxPriorityFeePerGas":"0xb","paymasterAndData":"0xe93eca6595fe94091dc1af46aac2a8b5d799077000000000000000000000000000000000000000000000000000000000657932c300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000032f2dd54d441872fdab1851d367a48f9346d6d44e7021337d6b0223fe2cfce7a375a6e5269b757fcb6ac0b984c637b3a952a2e11a7af38496f70453e0f6578db1b","signature":"0x9895d0999b694aa88778e48e26d7c6ecd52228c1008f1fa01f1964f20a7511e21d9cbbd5c277d8dcd07bee2dc91e938bb7b59a35c7582a2d130d62393379727f1c","townId":"0x0","functionHash":"createSpace"}' http://127.0.0.1:8686/api/sponsor-userop

# passes verification due to override rule
[mf:inf] POST /admin/api/sponsor-userop 200 OK (555ms)

# remove the override
curl -X POST -H "Content-Type: application/json" -d '{"operation":"every_wallet_can_mint_town_with_wl_email", "enabled":true}' http://127.0.0.1:8686/admin/api/add-override

# try verifying again...this should fail verification unless the user email is on a whitelist
curl -X POST -H "Content-Type: application/json" -d '{"sender":"0x9a3f50137aC64cf30f22C9f517b5E63bc50d9289","nonce":"0x0","initCode":"0x9406cc6185a346906296840746125a0e449764545fbfb9cf000000000000000000000000e367e571b1322e02f104cc81894d5869d1ebe99a0000000000000000000000000000000000000000000000000000000000000000","callData":"0x18dfb3c7000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000020000000000000000000000003870419ba2bbf0127060bcb37f69a1b1c090992b0000000000000000000000003870419ba2bbf0127060bcb37f69a1b1c090992b0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000044095ea7b30000000000000000000000009a3f50137ac64cf30f22c9f517b5e63bc50d92890000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044a9059cbb0000000000000000000000009a3f50137ac64cf30f22c9f517b5e63bc50d9289000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","callGasLimit":"0x5c1b","verificationGasLimit":"0x6fc21","preVerificationGas":"0xe150","maxFeePerGas":"0x1e9c62b06b","maxPriorityFeePerGas":"0xb","paymasterAndData":"0xe93eca6595fe94091dc1af46aac2a8b5d799077000000000000000000000000000000000000000000000000000000000657932c300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000032f2dd54d441872fdab1851d367a48f9346d6d44e7021337d6b0223fe2cfce7a375a6e5269b757fcb6ac0b984c637b3a952a2e11a7af38496f70453e0f6578db1b","signature":"0x9895d0999b694aa88778e48e26d7c6ecd52228c1008f1fa01f1964f20a7511e21d9cbbd5c277d8dcd07bee2dc91e938bb7b59a35c7582a2d130d62393379727f1c","townId":"0x0","functionHash":"createSpace"}' http://127.0.0.1:8686/api/sponsor-userop

[mf:inf] POST /api/sponsor-userop 401 Unauthorized (5ms)


# Add wallet linking override for 10 links ( need to pass in Authorization header with ADMIN_AUTH_SECRET in production)
curl -X POST -H "Content-Type: application/json" -d '{"operation":"every_wallet_can_link_n_wallets","enabled":true, "n": 10}' http://127.0.0.1:8686/admin/api/add-override
```

## Check actions within block interval

```
For each transaction method type (joinTown, createSpace, linkWallet, useTown)
we can check the number of on-chain transactions that have been mined by wallet, network for a block range.


To return the on-chain mint that wallet 0x8E476c0c0825645A2E67d11B1f204Ada060935A2 performed in January 2024 curl the /api/transaction-limits endpoint

➜  stackup-worker git:(jt/paymaster-proxy-2) ✗ curl -X POST -H "Content-Type: application/json" -d '{"environment":"test-beta","operation":"createSpace","rootAddress":"0x8E476c0c0825645A2E67d11B1f204Ada060935A2", "blockLookbackNum":1000000}' http://127.0.0.1:8686/api/transaction-limits | jq '.'
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  1363  100  1224  100   139   1250    141 --:--:-- --:--:-- --:--:--  1395
{
  "events": [
    {
      "blockNumber": 4232465,
      "blockHash": "0x1a20a74cf40fdfcdbd59814b41c16fb1f3c3aa41c1963d89104852d0e71d62e1",
      "transactionIndex": 1,
      "removed": false,
      "address": "0x8B2C167C808868C87C60b559b65866b82db2ef8e",
      "data": "0x",
      "topics": [
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
        "0x00000000000000000000000057e7c90ce73e327c863ad88909c3f73f5543f609",
        "0x0000000000000000000000008e476c0c0825645a2e67d11b1f204ada060935a2",
        "0x00000000000000000000000000000000000000000000000000000000000000d7"
      ],
      "transactionHash": "0x05024fc9a5a7c10407b5d3482b5b0e9b77f057ca34eaaf98870aa05ed31984bf",
      "logIndex": 14,
      "event": "Transfer",
      "eventSignature": "Transfer(address,address,uint256)",
      "args": [
        "0x57E7c90CE73e327c863AD88909C3F73F5543F609",
        "0x8E476c0c0825645A2E67d11B1f204Ada060935A2",
        {
          "type": "BigNumber",
          "hex": "0xd7"
        }
      ]
    }
  ],
  "contractAddress": "0x8B2C167C808868C87C60b559b65866b82db2ef8e",
  "eventName": "Transfer",
  "filter": {
    "address": "0x8B2C167C808868C87C60b559b65866b82db2ef8e",
    "topics": [
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
      "0x00000000000000000000000057e7c90ce73e327c863ad88909c3f73f5543f609",
      "0x0000000000000000000000008e476c0c0825645a2e67d11b1f204ada060935a2"
    ]
  },
  "blockStart": 3357154,
  "blockEnd": 4357154,
  "maxActionsPerDay": 3,
  "restricted": false
}

```

## Deploying

Deployment account and workers domain is defined in wrangler.toml config.

TEST (beta)
Publish to test for testing the workers.

```bash
$ CF_ENV must be set to the deploy environment in wrangler.toml
yarn publish
```

Unless specified in config, workers are deployed to `{name}`.johnhnt.workers.dev domain. See [Wrangler Config](https://developers.cloudflare.com/workers/wrangler/configuration/) for more details.
