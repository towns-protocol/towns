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
cp clients/web/app/.env.local-sample clients/web/app/.env.local
```

Then update `clients/web/app/.env.local` with the required (blank) keys.

3. Grab the NOTION_API_KEY from [here](https://www.notion.so/herenottherelabs/harmony-env-vars-1cb3562b1f4e801c9c2fe4917c182037) and add it to scripts/run-harmony/.env

4. Create a Certificate Authority. Run `./river/core/scripts/register-ca.sh` from the root of the repository. This will create the required `$HOME/river-ca-cert.pem` and `$HOME/river-ca-key.pem` files.

## Running everything locally

There are a couple ways to run the app locally: with VSCode/Cursor, or using a custom script that uses tmux.

### App development against remote envs

> ℹ️ **What's the difference between using VSCode tasks and the tmux script?**
>
> When running the app with VSCode tasks, the app will point to remote CF servers. When running the app with the tmux script, it will spin up local CF workers that the app will point to.

- For VSCode: Use the keystroke: `Ctrl+Shift+P` to bring up the command pallets and type `tasks`, select `Tasks: Run Task` and then select `Start Local Dev - <alpha|gamma|omega>`. This will start the required services for the app to run locally against a remote env.

- For tmux: Run `./scripts/run-harmony/run <alpha|gamma|omega>` from the root of the repository. This will start the required services for the app to run locally against a remote env, and attach you to a tmux session.

- Once these steps are complete, visit `localhost:3000` in your browser to access the app.

### App development against local blockchains/servers

To run using tmux:

- For VSCode: Use the keystroke: `Ctrl+Shift+P` to bring up the command pallets and type `tasks`, select `Tasks: Run Task` and then select `~4337: Start Local Dev~`.

- For tmux: Run `./scripts/run-harmony/run localhost` from the root of the repository. This will start the required services for the app to run locally against a remote env, and attach you to a tmux session.

- Once these steps are complete, visit `localhost:3000` in your browser to access the app.

### Tmux Tips

Recommended aliases in your `.zshrc` or shell of choice:

```
alias run_harmony="cd <root of harmony repo> && sh scripts/run-harmony/run.sh"
alias kill_harmony="cd <root of harmony repo> && sh scripts/kill_dev.sh Harmony"
```

Then you can run development on any env with `run_harmony <localhost|alpha|gamma|omega>`

When the startup script completes, you will be attached to a tmux session. You can view the windows from within the session by pressing `Ctrl+b` then `"w"`. Then you can switch to whatever process you want and hit `Enter` to attach to it. From here you can monitor or restart the process. i.e. if I made changes to the unfurl worker, I might attach and restart it. It's also an option to kill a process by pressing `Ctrl+c`, then in a separate terminal you can run the process again, if that's your desired workflow.

Kill your session with `kill_harmony`

If accidentally exit the tmux session, you can reattach with: `tmux attach -t Harmony`

You can see basic tmux commands [here](https://gist.github.com/simplysh/dd61e464e521efd1e17a8515f19d11d2).

If you make changes to river go code, or contracts, re-run `just RUN_ENV=multi config-and-start` to pick up the new changes (contracts will be redeployed, etc).

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
