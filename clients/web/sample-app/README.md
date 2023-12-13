# sample-app

Test app that uses our own use-matrix-client library module. Follow the README.md in the /lib directory to build the module first before running yarn in this directory.

## About this setup

We're using `workspace:^` as the source of the `use-matrix-client` dependency in the package json. This requires the files in `clients/web/lib` to be built using `yarn build`, but then changes should get picked up imediately. Use `yarn watch` to continuously build changes.

## First time set up

```bash
# from repository root
yarn install
```

## Build and run the matrix server

Follow instructions in the root of the repository to run dendrite

## Build and run the matrix sample app

```bash
cd clients/web/lib
yarn watch
cd clients/web/sample-app
yarn start
```

## Build and run matrix sample app against local servers

```bash
cp clients/web/sample-app/.env.local-sample clients/web/sample-app/.env.local
./scripts/start-local-basechain.sh
./scripts/deploy-towns-contracts.sh
./scripts/start-local-casablanca.sh
cd clients/web/lib
yarn watch
cd clients/web/sample-app
yarn dev
```

## Logging in

We currently support the Rinkeby Test Network. Enable test networks in MetaMask and select the Rinkeby Test Network.
