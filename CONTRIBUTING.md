# Contributing to Towns Protocol

## Prerequisites

- **Go**: [https://go.dev/](https://go.dev/)
- **Node v20.x.x**: We recommend using a version manager like [nvm](https://github.com/nvm-sh/nvm) to install node.
- **Docker**: We're using Docker to run PostgreSQL and Redis for local node development.
- **Bun 1.3**: We're using Bun to handle our monorepo. There should be only one `node_modules` and one lockfile at the root of the repository.
- **Anvil**: We're using Anvil to run a local Base network for development. Please follow the instructions [here](https://book.getfoundry.sh/getting-started/installation) to install Anvil.
- **Just**: We're using Just to run commands in the CLI. Please follow the instructions [here](https://github.com/casey/just) to install Just.
- **jq**: Json parser utility for the CLI.

## Setup

1. Run `bun install` from the root of the repository

1. Create `.env.local` files:

1. Create a Certificate Authority. Run `./core/scripts/register-ca.sh` from the root of the repository. This will create the required `$HOME/river-ca-cert.pem` and `$HOME/river-ca-key.pem` files.

## Running everything locally

Open VScode in the root of this directory: `code .`

Launch local environment via .vscode/tasks.json:

- `CMD+P` + `task ~Start Local Dev~` - Uses pre-built Docker image (recommended)
- `CMD+P` + `task ~Start Local Docker Dev~` - Uses locally built Docker image (for contract development)

This workflow runs the `.vscode/tasks.json` task labeled `~Start Local Dev~` and starts everything needed to work and run integration tests locally.

Both workflows use Docker containers with pre-deployed contracts.

![Screen Shot 2022-09-02 at 2 58 02 PM](https://user-images.githubusercontent.com/950745/188241222-c71d65dc-cda4-41db-8272-f5bdb18e26bf.png)

![Screen Shot 2022-09-02 at 3 05 12 PM](https://user-images.githubusercontent.com/950745/188241166-cf387398-6b43-4366-bead-b8c50fd1b0c2.png)

If you want to restart everything, `CMD+P` + `task KillAllLocalDev` will search for and terminate our processes. Please note this script both needs to be kept up to date if something is added, and also has very broad search parameters. If you want to try it out first, running `./scripts/kill-all-local-dev.sh` from the terminal will prompt you before it kills anything.

If you want to restart just the server, `CMD+P` + `task RestartCasablanca` will relaunch the servers. Same for `CMD+P` + `task RestartWatches`

## Tests

- Run all unit tests via: `bun run test:unit`
- Run all e2e tests via: `bun run test:e2e`
- Run all tests (both unit and e2e) via: `bun run test`

CI will gate PR merges via unit tests. However, failing e2e tests won't gate merges. In fact, they won't even be run pre-merge. e2e tests will be run after merging to main. This allows us to keep merging our work to main, while also staying aware of failing e2e tests.

### Testing CI Locally

Test GitHub CI workflows locally using `./scripts/run-local-ci.sh` (requires Docker):

```bash
# Test Common_CI job (linting, formatting, unit tests)
./scripts/run-local-ci.sh -j Common_CI

# Test Multinode job
./scripts/run-local-ci.sh -j Multinode
```

Use `--help` for all options. Useful when modifying CI workflows.

## Package.json Scripts

We use turborepo to maintain our monorepos CI setup. Since maintaining CI in monorepos are a bit more complex than conventional repos, we depend on this tool for housekeeping. It figures out the dependency graph by reading package.jsons and understands which builds and tests should be run first.

If you have a package in the monorepo, and
a) you want it to be built on CI, add a `"build"` script
b) you want it to be linted on CI, add a `"lint"` script
c) you want its unit tests to be run on CI, add a `"test:unit"` script

Sincerely,
The team
d) you want its e2e tests to be run on CI, add a `"test:e2e"` script
e) you want a single script to run all tests within the package, add `"test": "bun run test:unit && bun run test:e2e"` script to its package.json

Similarly, if you edit or delete these scripts, be aware that you may be removing those scripts from CI.

## Changesets

When making changes to published packages, you must create a changeset:

```bash
yarn changeset
```

This guides you through:

1. Selecting which packages changed
2. Choosing version bump type
3. Writing a summary for the changelog

### When is a changeset required?

- Any change to packages published to npm (see list below)
- Bug fixes, features, documentation updates affecting published code

### When can you skip a changeset?

- Changes to private packages (anvil-docker, docs, playground, stress, etc.)
- Changes to CI/build tooling only
- Changes to the `core/` directory

### Release process

1. Your PR merges to main (with changeset)
2. A "Version Packages" PR is automatically created/updated
3. Merging the Version Packages PR publishes to npm
