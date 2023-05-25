## Opinionated deployment scripting 🚀

Inspired by [hardhat-deploy](https://github.com/wighawag/hardhat-deploy)

For each contract being deployed, we create a script that will:

1. inherit from `Deployer`
2. implements a `contractName()` and `__deploy()` function

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;

import { Deployer } from "./common/Deployer.s.sol";
import { Pioneer } from "contracts/src/core/tokens/Pioneer.sol";

contract DeployPioneer is Deployer {
  function versionName() public pure override returns (string memory) {
    return "pioneerToken"; // will show up in addresses.json as key
  }

  function __deploy(uint256 deployerPK) public override returns (address) {
    vm.broadcast(deployerPK);
    return address(new Pioneer("Pioneer", "PIONEER", ""));
  }
}
```

The framework will:

1. Load an existing deployment from `packages/contracts/deployments/<network>/<contracts>.json`

2. if `OVERRIDE_DEPLOYMENTS=1` is set or if no deployments are found, it will:

- read `PRIVATE_KEY` from env (LOCAL_PRIVATE_KEY for anvil)
- invoke `__deploy()` with the private key
- if `SAVE_DEPLOYMENTS` is set; it will save the deployment to `packages/contracts/deployments/<network>/<contract>.json`

This makes it easy to:

- redeploy a single contract but load existing dependencies
- redeploy everything
- save deployments to version control (addresses atm)
- import existing deployments

## How to deploy

```
# say you want to deploy a new ${CONTRACT}

# Provision a new deployer
-> cast wallet new

# save the private in .env (PRIVATE_KEY=...||LOCAL_PRIVATE_KEY=...)
# Fund the deployer address
-> cast send ${NEW_WALLET_ADDRESS} --value 1ether -f 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

# perform a local simulation
-> forge script script/${CONTRACT}.s.sol

# perform a simulation against a network
-> forge script script/${CONTRACT}.s.sol --rpc-url <network>

# perform the deployment
-> SAVE_DEPLOYMENTS=1 forge script script/${CONTRACT}.s.sol --ffi --rpc-url <network> --broadcast --verify --watch

# Optionally verify the contract as a separate step
-> forge verify-contract <CONTRACT_ADDRESS> <CONTRACT_NAME> --chain <network> --watch
```

## How to script (interact with deployed contracts through foundry)

```
# say you want to upgrade an implementation of Space inside SpaceFactory

# deploy the same implementation contract you used to deploy SpaceImpl
# but with flags OVERRIDE_DEPLOYMENTS and SAVE_DEPLOYMENTS equal to 1
-> OVERRIDE_DEPLOYMENTS=1 SAVE_DEPLOYMENTS=1 make deploy-anvil contract=DeploySpaceImpl

# next we'll deploy the script UpgradeSpaceImpl without flags
# This will grab new and existing deployment addresses from our deployments cache and use those to interact with each other
-> make deploy-anvil contract=UpgradeSpaceImpl
```
