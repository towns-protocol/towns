# jwt-worker

The following Worker exposes a lightweight HTTP router and JWT service for generating JWT (Javascript Web Tokens)
signed in an [RFC7515](https://www.rfc-editor.org/rfc/rfc7515) fashion.

## Dependencies

- Wrangler 3.3.0 or newer
- Node 20.0.0 or newer
- Cloudlflare API Key

Once Wrangler is installed, run `wrangler login` to login to your Cloudflare account.

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

### Build

```bash
yarn
```

## Deploying to Local Dev

```bash
wrangler login
yarn dev:local
```

## Deploying to Production

Deployment account and workers domain is defined in wrangler.toml config.

```bash
yarn publish:prod-beta
```
