# sample-app

Test app that uses our own library module. Follow the README.md in the /lib directory to build the module first before running yarn in this directory.

## About this setup

We're using `workspace:^` as the source of dependencies in the package json. This requires the files in `clients/web/lib` to be built using `yarn build`, but then changes should get picked up imediately. Use `yarn watch` to continuously build changes.

## First time set up

```bash
# from repository root
yarn install
```

## Build and run the sample app

```bash
cd clients/web/lib
yarn watch
cd clients/web/sample-app
yarn start
```

## Build and run sample app against local servers

```bash
cp clients/web/sample-app/.env.local-sample clients/web/sample-app/.env.local
./scripts/start_dev.sh
```

## Logging in

We currently support the Rinkeby Test Network. Enable test networks in MetaMask and select the Rinkeby Test Network.
