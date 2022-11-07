## Getting Started

This template is meant to be used with [Wrangler](https://github.com/cloudflare/wrangler) to develop Cloudflare [Workers](https://developers.cloudflare.com/workers/). Clone this directory under `servers/` into a new directory to develop a new Worker.

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

### Testing

This template comes with jest tests utilizing [Miniflare](https://github.com/cloudflare/miniflare) which simply test that the request handler can handle each request method. `yarn test` will run your tests.

### Formatting

This template uses [`prettier`](https://prettier.io/) to format the project. To invoke, run `yarn format`.

### Build

```bash
yarn
```

### Deploying to Local Dev

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
yarn publish
```