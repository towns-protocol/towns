# River

Welcome to the River repo. Here you will find all of the components to run the complete River protocol, including stream node, protocols and contracts. As new components directories are added please update this readme to give a summary overview, and indicate if the component origin is River, or if a component is a fork of a component that should be tracked.

[/contracts](contracts) - Smart contracts related to the operation of the River network

[/core](core) - All Stream Node, and client artifacts.

## Prerequisites

- **Docker Desktop** we use docker to run postgresql, redis, etc for local development. Note, you may have to restart your computer after installing to grant it the right permissions <https://www.docker.com/products/docker-desktop/>

- **Node v20.x.x**, I recommend using nvm to install node: <https://github.com/nvm-sh/nvm>, then you can run `nvm use` to switch to the node version specified in .nvmrc, or `nvm alias default 20 && nvm use default` to set the default version across all of your terminals

- **golang** <https://go.dev/>

- **yarn 2** `npm install --global yarn` We're using yarn 2, which means that there should only be one node_modules folder and one yarn.lock file at the root of the repository. yarn 2 installation instructions are here <https://yarnpkg.com/getting-started/install>, if you're already using yarn it will automatically upgrade you behind the scenes.

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

1. Update submodules: `git submodule update --init --recursive`

Pro Tip: If you end up with .DS_Store files in your submodules, you can exclude them globally using

```
    echo .DS_Store >> ~/.gitignore_global
    git config --global core.excludesfile ~/.gitignore_global
```

2. Run `yarn install && yarn prepare` from the root of the repository

3. Create `.env.local` files:

4. Create a Certificate Authority. Run `./core/scripts/register-ca.sh` from the root of the repository. This will create the required `$HOME/river-ca-cert.pem` and `$HOME/river-ca-key.pem` files.

## Running everything locally

Open VScode in the root of this directory: `code .`

Launch local server via .vscode/tasks.json:

- Use the keystroke: `CMD+P` to bring up the switcher and type `task ~Start Local Dev~` (Once you type the word "task" you will see all the options from task.json in the dropdown)

This workflow runs the `.vscode/tasks.json` task labeled `~Start Local Dev~` and starts everything needed to work and run integration tests locally.

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

Sincerely,
The team
d) you want its e2e tests to be run on CI, add a `"test:e2e"` script
e) you want a single script to run all tests within the package, add `"test: yarn test:unit && yarn test:e2e"` script to its package.json

Similarly, if you edit or delete these scripts, be aware that you may be removing those scripts from CI.
