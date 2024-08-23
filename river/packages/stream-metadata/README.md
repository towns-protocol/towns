# River's image retrieval service

Fetches river images from river streams.

## Start the blockchains, river node, and the stream-metadata service

```bash
# from river root:
./scripts/start_dev.sh

```

## Local development in vscode

Run `./scripts/start_dev.sh`, and then kill the stream-metadata
service. Running the script will:

- build all the dependencies: core/_, packages/_, etc
- start the base chain, river chain, and river node

```bash
cd packages/stream-metadata
yarn dev
```
