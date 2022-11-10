# HNT

Cloudflare worker for unfurling content.

## Requirements

1. Copy dev.vars-sample to dev.vars and fill in the Twitter API token found here (TBD)
2. Run `yarn dev:local`

## Development

`yarn dev:local` - run the worker directly on your local machine. Does not require wrangler creds. DOES require .dev.vars

`yarn dev` - start local dev server. requires [Wrangler](https://github.com/cloudflare/wrangler) and then `wrangler login`. will give you access to secrets stored in cloudflare so you don't need dev.vars. Double check secret variables with `wrangler secret list` after logging in

## unfurl.js development

This worker uses a forked version of unfurl.js https://github.com/HereNotThere/unfurl to get it to work in worker environment.

If you need to the unfurl.js lib against this worker, clone it and then `yarn link ~/path/to/unfurl/clone` from harmony root. Yarn will add a resolution to package.json like `portal:...`. I could not get this to work unless I switched it to be `link:...`. Then you can run `npm run watch` from the clone.

## Testing

`yarn test` - runs a local version of cloudflare using `miniflare` (same as `yarn dev:local`). Should not require any Cloudflare credentials to run. You may need to run `yarn` first.

## Variables

Wrangler will automatically check your variables in `.dev.vars` in the project root. They are then available from the exectution context (`ctx.SOME_VAR`). When logged into Cloudflare via wrangler, it reads your variables from cloudflare and makes them available via the same context.

## Troubleshooting

- `wrangler secret list` - should output any secrets stored in Cloudflare
- If there's weird errors running tests, it could be caused by conflicting versions of `miniflare`. [issue](https://github.com/cloudflare/miniflare/issues/239#issuecomment-1092999752). Try `yarn why miniflare`. If there are confliciting versions and tests fail, try resolving miniflare to a single version in `harmony/packaga.json`

## Deploying to Production

Deployment account and workers domain is defined in wrangler.toml config.
Unless specified in config, workers are deployed to `{name}`.johnhnt.workers.dev domain. See [Wrangler Config](https://developers.cloudflare.com/workers/wrangler/configuration/) for more details.

```bash
yarn publish
```
