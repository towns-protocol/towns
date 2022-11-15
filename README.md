# Harmony

Welcome to the Harmony mono repo. Here you will find all of the components to run the complete Harmony service, including clients, services, protocols and contracts. As new components directories are added please update this readme to give a summary overview, and indicate if the component origin is Harmony, or if a component is a fork of a component that should be tracked.

[/contracts](contracts) - Smart contracts related to the operation of the Harmony network.

/clients - All client sources, including any external repos.

/servers - All server sources, including any external repos.

## Prerequisites

- **Docker Desktop** we use docker to run postgresql, redis, etc for local development. Note, you may have to restart your computer after installing to grant it the right permissions <https://www.docker.com/products/docker-desktop/>

- **Node v18.x.x**, I recommend using nvm to install node: <https://github.com/nvm-sh/nvm>, then you can run `nvm use` to switch to the node version specified in .nvmrc, or `nvm alias default 18 && nvm alias default node` to set the default version across all of your terminals

- **golang** <https://go.dev/>

- **yarn 2** `npm install --global yarn` We're using yarn 2, which means that there should only be one node_modules folder and one yarn.lock file at the root of the repository. yarn 2 installation instructions are here <https://yarnpkg.com/getting-started/install>, if you're already using yarn it will automatically upgrade you behind the scenes.

- **CMake** <https://cmake.org/download/>, Once cmake is installed, run and go to `Tools > How to Install For Command Line Usage` for instructions on how to add cmake to your path

- **anvil**

```
    curl -L https://foundry.paradigm.xyz | bash
    foundryup
    # If you see a warning about libusb, install it by running:\
    brew install libusb
```

## Setup

1. Update submodules: `git submodule update --init --recursive`

2. Run `yarn install && yarn prepare` from the root of the repository

## Running everything locally

If you would like to run the sample-app against a local server and blockchain (recommended), first:

```
cp clients/web/sample-app/.env.local-sample clients/web/sample-app/.env.local
cp clients/web/app/.env.local-sample clients/web/app/.env.local
```

Update `clients/web/sample-app/.env.local` with the giphy api key <https://www.notion.so/herenottherelabs/Credentials-4f284469da01425a9f7f936b9e3ed8aa>

Open VScode in the root of this directory: `code .`

Launch local server via .vscode/tasks.json: `CMD+P task ~Start Local Development~`

This workflow

- Reruns yarn install
- Launches local dendrite
- Starts a local block chain
- Deploys zion contracts
- starts the app, pointing to staging
- starts the sample-app, pointing to urls in .env.local

![Screen Shot 2022-09-02 at 2 58 02 PM](https://user-images.githubusercontent.com/950745/188241222-c71d65dc-cda4-41db-8272-f5bdb18e26bf.png)

![Screen Shot 2022-09-02 at 3 05 12 PM](https://user-images.githubusercontent.com/950745/188241166-cf387398-6b43-4366-bead-b8c50fd1b0c2.png)

## Integration tests

`./scripts/run-integration-tests.sh`
