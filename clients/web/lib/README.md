# lib

Common lib for Harmony clients.

## Build the library

```bash
cd clients/web/lib
yarn install # note, yarn install doesn't always work from this folder, try from root
yarn build
```

## Tests

We've implemented integration tests that run against a live server. See [Build and run Dendrite](../../../servers/README.md) to run a dendrite server locally
And run against a local blockchain, See [Zion-Governance](https://github.com:HereNotThere/zion-governance)

```bash
#from client root
./scripts/start-local-dendrite.sh
./scripts/start-local-blockchain.sh
./scripts/deploy-zion-governance-contracts.sh
cd clients/web/lib
yarn test
# OR - run from visual studio code via F5 or the "Jest: current file in 'web/lib/` commmand
```

## Tips and Tricks

If you're iterating on the sample app, use the following to automatically rebuild your typescript. These changes should get picked up by the running app

```bash
cd clients/web/lib
yarn watch
```
