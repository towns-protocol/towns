## Opinionated deployment scripting 🚀

Inspired by [hardhat-deploy](https://github.com/wighawag/hardhat-deploy)

For each contract being deployed, we create a script that will:

1. inherit from `Deployer`
2. implements a `contractName()` and `__deploy()` function

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import { Deployer } from "./common/Deployer.s.sol";
import { Pioneer } from "contracts/src/core/tokens/Pioneer.sol";

contract DeployPioneer is Deployer {
  function versionName() public pure override returns (string memory) {
    return "pioneerToken"; // will show up in packages/generated/{chain}/addresses/pioneerToken.json
  }

  function __deploy(address deployer) public override returns (address) {
    vm.broadcast(deployer);
    return address(new Pioneer("Pioneer", "PIONEER", ""));
  }
}
```

The framework will:

1. Load an existing deployment from `contracts/deployments/<network>/<contracts>.json`

2. if `OVERRIDE_DEPLOYMENTS=1` is set or if no deployments are found, it will:

- read `PRIVATE_KEY` from env (LOCAL_PRIVATE_KEY for anvil)
- invoke `__deploy()` with the private key
- if `SAVE_DEPLOYMENTS` is set; it will save the deployment to `contracts/deployments/<network>/<contract>.json`

This makes it easy to:

- redeploy a single contract but load existing dependencies
- redeploy everything
- save deployments to version control (addresses atm)
- import existing deployments

## Flags

- `OVERRIDE_DEPLOYMENTS=1`: It will redeploy a version of the contracts even if there's a cache in deployments assigned, be very careful when using this
- `SAVE_DEPLOYMENTS=1`: It will save a cached address of deployments to `contracts/deployments/<network>/<contract>.json`

## How to deploy

```bash
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

```bash
# say you want to upgrade an implementation of Space inside SpaceFactory

# deploy the same implementation contract you used to deploy SpaceImpl
# but with flags OVERRIDE_DEPLOYMENTS and SAVE_DEPLOYMENTS equal to 1
-> OVERRIDE_DEPLOYMENTS=1 SAVE_DEPLOYMENTS=1 make deploy-base-anvil contract=DeploySpaceImpl

# next we'll deploy the script UpgradeSpaceImpl without flags
# This will grab new and existing deployment addresses from our deployments cache and use those to interact with each other
-> make deploy-base-anvil contract=UpgradeSpaceImpl
```

## How to deploy a new space factory implementation, a new space implementation and update space factory to point to both of these?

1. Deploy new Space Factory implementation and `upgrade` current Space Factory proxy contract

```bash
SAVE_DEPLOYMENTS=1 make deploy-goerli contract=UpgradeSpaceFactoryImpl
```

2. Deploy new Space implementation, you can either override the current cached address or just change your `versionName()` in the contract to `spaceImplv2` and remove the `OVERRIDE_DEPLOYMENTS=1` flag

```bash
SAVE_DEPLOYMENTS=1 OVERRIDE_DEPLOYMENTS=1 make deploy-goerli contract=DeploySpaceImpl
```

3. Update the Space Factory with the new Space Implementation

```bash
SAVE_DEPLOYMENTS=1 make deploy-goerli contract=UpgradeSpaceImpl
```

# How to deploy predeterministic contracts?

```
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

//interfaces

//libraries

//contracts
import {Deployer} from "./utils/Deployer.s.sol";
import {Hello} from "src/hello/Hello.sol";

// debuggging
import {console} from "forge-std/console.sol";

contract DeployHello is Deployer {
  function versionName() public pure override returns (string memory) {
    return "hello";
  }

  function __deploy(uint256 deployerPK) public override returns (address) {
    bytes32 salt = bytes32(uint256(deployerPK)); // create a salt

    bytes32 initCodeHash = hashInitCode(
      type(Hello).creationCode,
      abi.encode("Hello, World!") // encode any parameters that will go in the contstructor
    );

    address predeterminedAddress = computeCreate2Address(salt, initCodeHash);

    vm.startBroadcast(deployerPK);
    Hello hello = new Hello{salt: salt}("Hello, World!");
    vm.stopBroadcast();

    require(address(hello) == predeterminedAddress, "DeployHello: address mismatch");

    return address(hello);
  }
}
```
