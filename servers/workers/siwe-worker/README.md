## Getting Started

This template is meant to be used with [Wrangler](https://github.com/cloudflare/wrangler) to develop Cloudflare [Workers](https://developers.cloudflare.com/workers/).

1. Clone this directory under `servers/` into a new directory to develop a new Worker.
2. Change the name in `package.json`
3. Change the name in `wrangler.toml`
4. Add an entry to `harmony/.prettierignore` like `!servers/your-worker`.
5. Add an entry to `harmony/package.json` workspaces like `servers/your-worker`.

If you are not already familiar with the Wrangler, install and configure it to work with your [Cloudflare account](https://dash.cloudflare.com). Documentation can be found [here](https://developers.cloudflare.com/workers/tooling/wrangler/).

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

```
echo 'AUTH_SECRET=foo' >> .dev.vars
yarn dev:local
# verify dummy signature and message
curl -X PUT localhost:8007 -H "Authorization: Bearer Zm9v" -d '{"message":{"domain":"localhost:4361","address":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266","chainId":31337,"uri":"http://localhost:4361","version":"1","statement":"SIWE Notepad Example","nonce":"4gBymylmAjlqGOPpI","issuedAt":"2023-01-13T00:15:43.293Z"},"signature":"0x969ec6cee0bd295be2ae4d9af1e759d6154738511bd0ad78825737c1c583e5d900166658ecb49a82c81cfbae53b23e8defa842fa56ed1312ae6be8f20afda6cb1c"}'
```

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
curl http://127.0.0.1:8787
Hello World from GET!
```

## Deploying to Production

Deployment account and workers domain is defined in wrangler.toml config.
Unless specified in config, workers are deployed to `{name}`.johnhnt.workers.dev domain. See [Wrangler Config](https://developers.cloudflare.com/workers/wrangler/configuration/) for more details.

```bash
yarn install
yarn run --top-level worker:build
yarn publish:prod
```
