# Harmony

Welcome to the Harmony mono repo. Here you will find all of the components to run the complete Harmony service, including clients, services, protocols and contracts. As new components directories are added please update this readme to give a summary overview, and indicate if the component origin is Harmony, or if a component is a fork of a component that should be tracked.

[/contracts](contracts) - Smart contracts related to the operation of the Harmony network.

/clients - All client sources, including any external repos.

/servers - All server sources, including any external repos.

## Prerequisites

- **Docker Desktop** we use docker to run postgresql, redis, etc for local development. Note, you may have to restart your computer after installing to grant it the right permissions <https://www.docker.com/products/docker-desktop/>

- **Node v20.x.x**, I recommend using nvm to install node: <https://github.com/nvm-sh/nvm>, then you can run `nvm use` to switch to the node version specified in .nvmrc, or `nvm alias default 20 && nvm use default` to set the default version across all of your terminals

- **golang** <https://go.dev/>, you can also install it with brew:

```
    brew install go
```

- **yarn 2** `npm install --global yarn` We're using yarn 2, which means that there should only be one node_modules folder and one yarn.lock file at the root of the repository. yarn 2 installation instructions are here <https://yarnpkg.com/getting-started/install>, if you're already using yarn it will automatically upgrade you behind the scenes.

We now require yarn 3.8.0, so after installing you should run:

```
    yarn set version 3.8.0
```

- **CMake** <https://cmake.org/download/>, Once cmake is installed, run and go to `Tools > How to Install For Command Line Usage` for instructions on how to add cmake to your path

- **anvil**

```
    curl -L https://foundry.paradigm.xyz | bash
    ./scripts/foundry-up.sh
    # If you see a warning about libusb, install it by running:\
    brew install libusb
```

- **jq**

```
    brew install jq
```

## Setup

1. Run `yarn install && yarn prepare` from the root of the repository

2. Create `.env.local` files:

First:

```
cp clients/web/sample-app/.env.local-sample clients/web/sample-app/.env.local
cp clients/web/app/.env.local-sample clients/web/app/.env.local
```

Then update `clients/web/app/.env.local` with the required (blank) keys.

3. For local Cloudflare workers to run properly, you'll need to add their secret env variables. At `servers/workers/` you'll see: `gateway-worker`, `token-worker`, `unfurl-worker`, and `stackup-worker`. For each, `cp .dev.vars-sample .dev.vars` and add the required config. You can do all this with the following command:

```
    for dir in gateway-worker token-worker unfurl-worker stackup-worker; do
  (cd servers/workers/$dir && cp .dev.vars-sample .dev.vars && echo "Copied .dev.vars for $dir")
done
```

> !! YOU CAN FIND A SAMPLE OF ALL THE REQUIRED VALUES FOR 1 AND 2 IN [THIS NOTION DOC](https://www.notion.so/herenottherelabs/env-files-for-local-dev-046b81ff5bb947d69b9c3cf107c3597d) !!

4. Create a Certificate Authority. Run `./river/core/scripts/register-ca.sh` from the root of the repository. This will create the required `$HOME/river-ca-cert.pem` and `$HOME/river-ca-key.pem` files.

## Running everything locally

Open VScode in the root of this directory: `code .`

There are a few ways to run the local dev environment:

### App development against gamma (uses Account Abstraction)

- Use the keystroke: `Ctrl+Shift+P` to bring up the command pallets and type `tasks`, select `Tasks: Run Task` and then select `Start local Apps and workers`. This will start the required services for the app and workers to run locally, against River's gamma environment (base-sepolia, deployed river nodes, etc).
- You MUST make sure the env switcher in the bottom right of the app UI is set to `gamma`.

### App development against local blockchains/servers with Account Abstraction

- This mirrors the production setup, locally. (This will be ported to start_dev/tmux when I have time)

1. Use the keystroke: `Ctrl+Shift+P` to bring up the command pallets and type `tasks`, select `~4337: Start Local Dev~`. It will take several minutes to start up.
2. Wait for all the tasks to spin up. Then you can either run the task: `"4337: Run Casablanca-Multinode`, or (recommended), in a separate terminal run: `cd ./river/core && just BASE_EXECUTION_CLIENT=geth_dev RUN_ENV=multi config-and-start`.

- Once these steps are complete, visit `localhost:3000` in your browser to access the app.
- You MUST make sure the env switcher in the bottom right of the app UI is set to `local` to run against the local environment.
- If you are working on user operations, base chain transactions, SpaceDapp, you should run the app this way!!

If you make changes to river go code, or contracts, re-run the just command from step 2 (or kill and restart the task) to pick up the new changes (contracts will be redeployed, etc).

### App development against local blockchains/servers without Account Abstraction

- This is the same as above, without account abstraction. Use the keystroke: `Ctrl+Shift+P` to bring up the command pallets and type `tasks`, select `~Start Local Dev~`.
- You can use the env switcher in the bottom right of the app UI to switch between `local` and `gamma`.

- This is not recommended for most development, because things can become confusing when you have to reconcile the account abstraction flow vs the non-account abstraction flow, you might write working code that follows a path that is not called in AA flow, etc.However, if you are working on something that is more related to River protocol (messsaging, streams, etc) and not user operations or base chain txs, you can use this setup.

This is also an ok step to debug a base chain transaction - like maybe you want to see that the tx actually works w/out the AA layer - but you should always test the final version of your code in the AA flow.

![Screen Shot 2022-09-02 at 2 58 02 PM](https://user-images.githubusercontent.com/950745/188241222-c71d65dc-cda4-41db-8272-f5bdb18e26bf.png)

![Screen Shot 2022-09-02 at 3 05 12 PM](https://user-images.githubusercontent.com/950745/188241166-cf387398-6b43-4366-bead-b8c50fd1b0c2.png)

If you want to restart everything, `CMD+P` + `task KillAllLocalDev` will search for and terminate our processes. Please note this script both needs to be kept up to date if something is added, and also has very broad search paramaters. If you want to try it out first, running `./scripts/kill-all-local-dev.sh` from the terminal will prompt you before it kills anything.

If you want to restart just the server, `CMD+P` + `task RestartCasablanca` will relaunch the servers. Same for `CMD+P` + `task RestartWatches`

## Tests

- Run all unit tests via: `yarn test:unit`
- Run all e2e tests via: `yarn test:e2e`
- Run all tests (both unit and e2e) via: `yarn test`

CI will gate PR merges via unit tests. However, failing e2e tests won't gate merges. In fact, they won't even be run pre-merge. e2e tests will be run after merging to main. This allows us to keep merging our work to main, while also staying aware of failing e2e tests.

## Package.json Scripts

We use turborepo to maintain our monorepos CI setup. Since maintaining CI in monorepos are a bit more complex than conventional repos, we depend on this tool for housekeeping. It figures out the dependency graph by reading package.jsons and understands which builds and tests should be run first.

If you have a package in the monorepo, and
a) you want it to be built on CI, add a `"build"` script
b) you want it to be linted on CI, add a `"lint"` script
c) you want its unit tests to be run on CI, add a `"test:unit"` script
d) you want its e2e tests to be run on CI, add a `"test:e2e"` script
e) you want a single script to run all tests within the package, add `"test: yarn test:unit && yarn test:e2e"` script to its package.json

Similarly, if you edit or delete these scripts, be aware that you may be removing those scripts from CI.
