## Opinionated deployment scripting 🚀

Inspired by [hardhat-deploy](https://github.com/wighawag/hardhat-deploy)

For each contract being deployed, we create a script that will:

1. inherit from `Deployer`
2. implement a `versionName()` and `__deploy()` function

Example contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Deployer } from "scripts/common/Deployer.s.sol";
import { MockERC721A } from "test/mocks/MockERC721A.sol";

contract DeployMockERC721A is Deployer {
  function versionName() public pure override returns (string memory) {
    return "mockERC721A";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.broadcast(deployer);
    return address(new MockERC721A());
  }
}
```

The framework will:

1. Load an existing deployment from
   `contracts/deployments/<deploymentContext>/<chainIdAlias>/<contracts>.json`

2. if `OVERRIDE_DEPLOYMENTS=1` is set or if no deployments are found, it will:

- read `PRIVATE_KEY` from env (LOCAL_PRIVATE_KEY for anvil) or wait for ledger
- invoke `__deploy()` function
- if `SAVE_DEPLOYMENTS` is set; it will save the deployment to
  `contracts/deployments/deploymentContext/<network>/<contract>.json`

This makes it easy to:

- redeploy a single contract but load existing dependencies
- redeploy everything
- save deployments to version control (addresses atm)
- import existing deployments

## Flags

- `OVERRIDE_DEPLOYMENTS=1`: It will redeploy a version of the contracts even if there's a cache in
  deployments assigned, be very careful when using this
- `SAVE_DEPLOYMENTS=1`: It will save a cached address of deployments to
  `contracts/deployments/<network>/<contract>.json`
- `DEPLOYMENT_CONTEXT=string`: It will save the addresses on a subdirectory with the given name,
  useful for deployment contract to same network

## How to deploy locally (step-by-step)

```bash
# say you want to deploy a new MockERC721A

# Provision a new deployer
-> cast wallet new

# save the key in .env (LOCAL_PRIVATE_KEY=...)

# Fund the deployer address (this is the first address shown when runing `anvil`)
-> cast send ${NEW_WALLET_ADDRESS} --value 1ether -f 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --unlocked

# perform a local simulation
-> forge script script/${CONTRACT}.s.sol

# perform a simulation against a network
-> forge script script/${CONTRACT}.s.sol --rpc-url <network>

# run anvil in separate terminal
-> anvil

# perform the deployment to a local network
-> make deploy-any-local contract=DeployMockERC721A type=facets
```

## How to deploy to a testnet or mainnet

```bash
# To deploy a contract to Base Sepolia in the "gamma" deployment context:
-> make deploy-base-sepolia contract=DeployWalletLink type=facets context=gamma

# To deploy with a ledger hardware wallet to Base mainnet:
-> make deploy-base contract=DeploySpaceFactory type=diamonds context=omega

# To redeploy a contract to Base Sepolia in the "gamma" deployment context:
-> OVERRIDE_DEPLOYMENTS=1 make deploy-base-sepolia contract=DeployWalletLink type=facets context=gamma
```

## How to script (interact with deployed contracts through foundry)

```bash
# say you want to mint from MockERC721A

# deploy a local implementation of MockERC721A by calling DeployMockERC721A
-> make deploy-any-local rpc=base_anvil contract=DeployMockERC721A type=facets

# next we'll call the script InteractMockERC721A
# This will grab new and existing deployment addresses from our deployments cache and use those to interact with each other
-> make interact-any-local rpc=base_anvil contract=InteractMockERC721A
```
