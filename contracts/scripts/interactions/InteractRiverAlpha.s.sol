// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamondCut} from "@river-build/diamond/src/facets/cut/IDiamondCut.sol";

// libraries

// contracts
import {AlphaHelper} from "contracts/scripts/interactions/helpers/AlphaHelper.sol";

import {DeployRiverRegistry} from "contracts/scripts/deployments/diamonds/DeployRiverRegistry.s.sol";

contract InteractRiverAlpha is AlphaHelper {
  DeployRiverRegistry deployRiverRegistry = new DeployRiverRegistry();

  function __interact(address deployer) internal override {
    address riverRegistry = deployRiverRegistry.deploy(deployer);

    removeRemoteFacets(deployer, riverRegistry);
    FacetCut[] memory newCuts;

    deployRiverRegistry.diamondInitParams(deployer);
    newCuts = deployRiverRegistry.getCuts();

    vm.broadcast(deployer);
    IDiamondCut(riverRegistry).diamondCut(newCuts, address(0), "");
  }
}
