// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {FacetHelper} from "@river-build/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {PausableFacet} from "@river-build/diamond/src/facets/pausable/PausableFacet.sol";

contract DeployPausable is FacetHelper, Deployer {
  constructor() {
    addSelector(PausableFacet.paused.selector);
    addSelector(PausableFacet.pause.selector);
    addSelector(PausableFacet.unpause.selector);
  }

  function versionName() public pure override returns (string memory) {
    return "pausableFacet";
  }

  function initializer() public pure override returns (bytes4) {
    return PausableFacet.__Pausable_init.selector;
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    PausableFacet facet = new PausableFacet();
    vm.stopBroadcast();
    return address(facet);
  }
}
