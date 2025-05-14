## Opinionated deployment scripting 🚀

Inspired by [hardhat-deploy](https://github.com/wighawag/hardhat-deploy)

This project supports two methods for deploying contracts:

### Method 1: Custom Deployment Scripts

For each contract being deployed, we create a script that will:

1. inherit from `Deployer`
2. implement a `versionName()` and `__deploy()` function

Example contract:

<details>
<summary>Click to expand example code</summary>

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

</details>

The framework will:

1. Load an existing deployment from
   `contracts/deployments/<deploymentContext>/<chainIdAlias>/<contracts>.json`

2. if `OVERRIDE_DEPLOYMENTS=1` is set or if no deployments are found, it will:

- read `PRIVATE_KEY` from env (LOCAL_PRIVATE_KEY for anvil) or wait for ledger
- invoke `__deploy()` function
- if `SAVE_DEPLOYMENTS` is set; it will save the deployment to
  `contracts/deployments/deploymentContext/<network>/<contract>.json`

### Method 2: DeployFacet Script (For Facet Contracts)

For facet contract deployments, we also support a standardized deployment process using the `DeployFacet.s.sol` script which:

1. Uses deterministic CREATE2 addresses for predictable deployment outcomes
2. Supports batch deployments for gas efficiency
3. Provides advanced gas estimation and deployment verification

- `OVERRIDE_DEPLOYMENTS=1`: It will redeploy a version of the contracts even if there's a cache in
  deployments assigned, be very careful when using this
- `SAVE_DEPLOYMENTS=1`: It will save a cached address of deployments to
  `contracts/deployments/<network>/<contract>.json`
- `DEPLOYMENT_CONTEXT=string`: It will save the addresses on a subdirectory with the given name,
  useful for deployment contract to same network

## How to write new deployment libraries and diamonds

This project uses two distinct but complementary components for diamond pattern deployments:

### 1. Facet Deployment Libraries

Facet deployment libraries (like `DeployMembershipMetadata.s.sol`) define helper functions for diamond cuts but don't handle the actual facet contract deployment. These libraries typically provide:

1. A `selectors()` function that returns an array of function selectors the facet provides
2. A `makeCut()` function that creates a `FacetCut` struct for diamond upgrades
3. Optional: A `deploy()` function for manual deployment (though we prefer using `DeployFacet` for this)

To create a new facet deployment library:

1. Create a new file `Deploy[YourFacet].s.sol` in `scripts/deployments/facets/`
2. Implement the required functions as shown in the example below

Example of a facet deployment library:

<details>
<summary>Click to expand example code</summary>

```solidity
import { IDiamond } from "@towns-protocol/diamond/src/Diamond.sol";
import { IMembershipMetadata } from "src/spaces/facets/membership/metadata/IMembershipMetadata.sol";
import { LibDeploy } from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

library DeployMembershipMetadata {
  // Return all function selectors this facet provides
  function selectors() internal pure returns (bytes4[] memory res) {
    res = new bytes4[](2);
    res[0] = IMembershipMetadata.refreshMetadata.selector;
    res[1] = IMembershipMetadata.tokenURI.selector;
  }

  // Create a FacetCut struct for diamond upgrades
  function makeCut(
    address facetAddress,
    IDiamond.FacetCutAction action
  ) internal pure returns (IDiamond.FacetCut memory) {
    return IDiamond.FacetCut(facetAddress, action, selectors());
  }

  // Optional direct deployment method (prefer using DeployFacet instead)
  function deploy() internal returns (address) {
    return LibDeploy.deployCode("MembershipMetadata.sol", "");
  }
}
```

</details>

### 2. Diamond Deployment Scripts

Diamond deployment scripts (like `DeploySpace.s.sol`) coordinate the deployment of multiple facets and their integration into a diamond. These scripts:

1. Use `DeployFacet` to efficiently deploy multiple facets using CREATE2 and Multicall3
2. Use the facet deployment libraries to prepare diamond cuts
3. Handle the initialization and configuration of the diamond

To create a new diamond deployment script:

1. Create a new file `Deploy[YourDiamond].s.sol` in `scripts/deployments/diamonds/`
2. Inherit from `DiamondHelper`, `Deployer` and implement required functions
3. Use `DeployFacet` for batch deployments of facets
4. Use facet deployment libraries to create diamond cuts

Example pattern from `DeploySpace.s.sol`:

<details>
<summary>Click to expand example code</summary>

```solidity
contract DeploySpace is DiamondHelper, Deployer {
  // Create a DeployFacet helper for batch deployments
  DeployFacet private facetHelper = new DeployFacet();

  function versionName() public pure override returns (string memory) {
    return "space";
  }

  function __deploy(address deployer) internal override returns (address) {
    // Add core facets (like DiamondCut, DiamondLoupe, etc.)
    addImmutableCuts(deployer);

    // Set up diamond initialization parameters with additional facets
    Diamond.InitParams memory initDiamondCut = diamondInitParams(deployer);

    // Deploy the diamond with all facets
    vm.broadcast(deployer);
    Diamond diamond = new Diamond(initDiamondCut);

    return address(diamond);
  }

  function diamondInitParams(
    address deployer
  ) public returns (Diamond.InitParams memory) {
    // Queue facets for batch deployment
    facetHelper.add("MembershipToken");
    facetHelper.add("MembershipMetadata");
    // ... add other facets ...

    // Deploy all queued facets in a single transaction
    facetHelper.deployBatch(deployer);

    // Add each facet to the diamond cut using the corresponding deployment library
    address facet = facetHelper.getDeployedAddress("MembershipMetadata");
    addCut(
      DeployMembershipMetadata.makeCut(facet, IDiamond.FacetCutAction.Add)
    );

    // ... add other facets ...

    // Return the diamond initialization parameters
    return
      Diamond.InitParams({
        baseFacets: baseFacets(),
        init: multiInit,
        initData: abi.encodeCall(
          MultiInit.multiInit,
          (_initAddresses, _initDatas)
        )
      });
  }
}
```

</details>

### Integration with makefile

Once you've created your deployment components, you can use them with the makefile:

```bash
# To deploy a specific facet:
make deploy-facet rpc=base_sepolia contract=YourFacet

# To deploy a diamond:
make deploy-base-sepolia contract=DeployYourDiamond type=diamonds
```

This approach separates facet contract deployment (using `DeployFacet` with CREATE2) from diamond integration (using facet deployment libraries), providing both efficiency and flexibility.

### How to deploy locally (step-by-step)

<details>
<summary>Click to expand deployment steps</summary>

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
# Option 1: Custom deployment script
-> make deploy-any-local contract=DeployMockERC721A type=facets

# Option 2: Using the DeployFacet script (for facet contracts)
-> make deploy-facet-local rpc=base_anvil contract=MockERC721A
```

</details>

### How to deploy to a testnet or mainnet

<details>
<summary>Click to expand deployment steps</summary>

```bash
# Method 1: Using custom deployment scripts
# To deploy a contract to Base Sepolia in the "gamma" deployment context:
-> make deploy-base-sepolia contract=DeployWalletLink type=facets context=gamma

# Method 2: Using the DeployFacet script
# To deploy a facet to Base Sepolia:
-> make deploy-facet rpc=base_sepolia contract=WalletLink context=gamma

# To deploy with a ledger hardware wallet to Base mainnet:
# Method 1: Using custom deployment scripts
-> make deploy-base contract=DeploySpaceFactory type=diamonds context=omega

# Method 2: Using the DeployFacet script
-> make deploy-facet-ledger rpc=base contract=WalletLink context=omega

# To redeploy a contract to Base Sepolia in the "gamma" deployment context:
-> OVERRIDE_DEPLOYMENTS=1 make deploy-base-sepolia contract=DeployWalletLink type=facets context=gamma
```

</details>

### How to script (interact with deployed contracts through foundry)

<details>
<summary>Click to expand example steps</summary>

```bash
# say you want to mint from MockERC721A

# deploy a local implementation of MockERC721A by calling DeployFacet
-> make deploy-facet-local rpc=base_anvil contract=MockERC721A

# next we'll call the script InteractMockERC721A
# This will grab new and existing deployment addresses from our deployments cache and use those to interact with each other
-> make interact-any-local rpc=base_anvil contract=InteractMockERC721A
```

</details>
