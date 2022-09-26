# Harmony

Welcome to the Harmony mono repo. Here you will find all of the components to run the complete Harmony service, including clients, services, protocols and contracts. As new components directories are added please update this readme to give a summary overview, and indicate if the component origin is Harmony, or if a component is a fork of a component that should be tracked.

[/contracts](contracts/zion-governance) - Smart contracts related to the operation of the Harmony network.

/clients - All client sources, including any external repos.

/servers - All server sources, including any external repos.

## Prerequisites

- Node v16.x.x, I recommend using nvm to install node: <https://github.com/nvm-sh/nvm>, then you can run `nvm use` to switch to the node version specified in .nvmrc, or `nvm alias default 16.10` to set the default version across all of your terminals

- golang <https://go.dev/>

- `npm install --global yarn` We're using yarn 2, which means that there should only be one node_modules folder and one yarn.lock file at the root of the repository. yarn 2 installation instructions are here <https://yarnpkg.com/getting-started/install>, if you're already using yarn it will automatically upgrade you behind the scenes.

- CMake Is required to run yarn install. https://cmake.org/download/

## Setup

1. Run `yarn install` and `yarn prepare` from the root of the repository

2. Run a dendrite server. Follow instructions in /servers/README.md "Build and Run Dendrite"

3. Launch the sample app. Follow instructions in /clients/web/sample-app

## Running everything locally

If you would like to run against a local server and blockchain, first:

```
cp clients/web/sample-app/.env.local-sample clients/web/sample-app/.env.local
```

Then follow setup instructions in [/contracts/zion-governance](contracts/zion-governance)

Then you can launch everything in VSCode via a vscode/tasks.json that allows all with `CMD+P task ~Start Local Development~`

This workflow

- Launches local dendrite
- Starts a local block chain
- Deploys zion contracts
- starts the app, pointing to staging
- starts the sample-app, pointing to urls in .env.local

![Screen Shot 2022-09-02 at 2 58 02 PM](https://user-images.githubusercontent.com/950745/188241222-c71d65dc-cda4-41db-8272-f5bdb18e26bf.png)

![Screen Shot 2022-09-02 at 3 05 12 PM](https://user-images.githubusercontent.com/950745/188241166-cf387398-6b43-4366-bead-b8c50fd1b0c2.png)
