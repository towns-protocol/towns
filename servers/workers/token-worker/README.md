# HNT

Cloudflare worker for interacting with NFTs (via Alchemy)

## Requirements

!! Not deployed, only runs in local environment, any client code using endpoint should be behind `isDev` flag.

1. `yarn install`
2. Copy dev.vars-sample to dev.vars
3. Run `yarn dev:local`
4. The server should be running at `localhost:8006`

---

## Endpoints

```
/api/getCollectionMetadata/:provider/:network
/api/getCollectionsForOwner/:provider/:network/:address
```

Where `:provider` is the nft api provider:

`al` - Alchemy
`in` - Infura - deprecated

Where `:network` is `eth-mainnet` or any string (anything besides `eth-mainnet` will point to Goerli).

Where `:address` is hex address or ens domain i.e. `vitalik.eth`.

Example:

```
http://localhost:8006/api/getNftsForOwner/eth-mainnet/vitalik.eth
```

---

## Development

`yarn dev:local` - run the worker directly on your local machine. Does not require wrangler creds. DOES require .dev.vars

`yarn dev` - start local dev server. requires [Wrangler](https://github.com/cloudflare/wrangler) and then `wrangler login`. will give you access to secrets stored in cloudflare so you don't need dev.vars. Double check secret variables with `wrangler secret list` after logging in

## Testing

TODO

`yarn test` - runs a local version of cloudflare using `miniflare` (same as `yarn dev:local`). Should not require any Cloudflare credentials to run. You may need to run `yarn` first.

## Variables

Wrangler will automatically check your variables in `.dev.vars` in the project root. They are then available from the exectution context (`ctx.SOME_VAR`). When logged into Cloudflare via wrangler, it reads your variables from cloudflare and makes them available via the same context.

## Troubleshooting

- `wrangler secret list` - should output any secrets stored in Cloudflare
- If there's weird errors running tests, it could be caused by conflicting versions of `miniflare`. [issue](https://github.com/cloudflare/miniflare/issues/239#issuecomment-1092999752). Try `yarn why miniflare`. If there are confliciting versions and tests fail, try resolving miniflare to a single version in `harmony/packaga.json`

## Deploying

Deployment account and workers domain is defined in wrangler.toml config.

PRODUCTION (alpha)

Unless specified in config, workers are deployed to `{name}`.johnhnt.workers.dev domain. See [Wrangler Config](https://developers.cloudflare.com/workers/wrangler/configuration/) for more details.

```bash
yarn publish:prod
```

TEST (beta)

```
yarn publish:test-beta
```
