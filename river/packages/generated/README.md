# @harmony/contracts

## How to bundle and publish this package?

From the root of the repo, run:

```bash
./scripts/build-contract-types.sh
```

## How to install this package in a workspace?

```bash
yarn workspace @harmony/{workspace_name} add @harmony/contracts
```

## What are deployments?

Deployments are a group of contracts on multiple chains that together make up a river environment

from the root of the repo run ./scripts/deploy-contracts.sh --e single

## Addresses

One off contracts that are important to the ecosystem at large