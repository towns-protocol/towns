# HNT

Cloudflare worker for unfurling content.

## Requirements

1. Copy dev.vars-sample to dev.vars and fill in the Twitter API token found here (TBD)
2. Run `yarn dev:local`

## Development

`yarn dev:local` - run the worker directly on your local machine. Does not require wrangler creds. DOES require .dev.vars

`yarn dev` - start local dev server. requires [Wrangler](https://github.com/cloudflare/wrangler) and then `wrangler login`. will give you access to secrets stored in cloudflare so you don't need dev.vars. Double check secret variables with `wrangler secret list` after logging in

## Testing

`yarn test` - runs a local version of cloudflare using `miniflare` (same as `yarn dev:local`). Should not require any Cloudflare credentials to run

## Variables

Wrangler will automatically check your variables in `.dev.vars` in the project root. They are then available from the exectution context (`ctx.SOME_VAR`). When logged into Cloudflare via wrangler, it reads your variables from cloudflare and makes them available via the same context.

## Troubleshooting

- `wrangler secret list` - should output any secrets stored in Cloudflare
- If there's weird errors running tests, it could be caused by conflicting versions of `miniflare`. [issue](https://github.com/cloudflare/miniflare/issues/239#issuecomment-1092999752). Try `yarn why miniflare`. `harmony/packaga.json` resolve miniflare to a single version

## Deploying to Production

Deployment account and workers domain is defined in wrangler.toml config.
Unless specified in config, workers are deployed to `{name}`.johnhnt.workers.dev domain. See [Wrangler Config](https://developers.cloudflare.com/workers/wrangler/configuration/) for more details.

```bash
yarn publish
```
