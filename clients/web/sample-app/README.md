# sample-app

Test app that uses our own use-matrix-client library module. Follow the README.md in the /lib directory to build the module first before running yarn in this directory.

## First time set up

Link to the local library and install dependencies for the sample app.

```bash
cd clients/web/sample-app
yarn install
npm link ../lib
# Some dependencies are broken after linking.
# Have to re-run yarn install. Investigate.
yarn install
```

## Build and run the matrix server

Temporary. The synapse server will be replaced by the dendrite server.

```bash
# Docker should be installed and running.
cd servers/sample-synapse
yarn start
```

## Build and run the matrix sample app

```bash
cd clients/web/sample-app
yarn start
```
