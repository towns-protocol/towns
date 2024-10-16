// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

import {CreateSpaceFacet} from "contracts/src/factory/facets/create/CreateSpace.sol";

contract DeployCreateSpace is FacetHelper, Deployer {
  constructor() {
    addSelector(CreateSpaceFacet.createSpace.selector);
    addSelector(CreateSpaceFacet.createSpaceWithPrepay.selector);
  }

  function initializer() public pure override returns (bytes4) {
    return CreateSpaceFacet.__CreateSpace_init.selector;
  }

  function versionName() public pure override returns (string memory) {
    return "createSpaceFacet";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    CreateSpaceFacet facet = new CreateSpaceFacet();
    vm.stopBroadcast();
    return address(facet);
  }
}
