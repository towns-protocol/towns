// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// helpers
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {SpaceDelegationFacet} from "contracts/src/base/registry/facets/delegation/SpaceDelegationFacet.sol";

contract DeploySpaceDelegation is Deployer, FacetHelper {
  constructor() {
    addSelector(SpaceDelegationFacet.addSpaceDelegation.selector);
    addSelector(SpaceDelegationFacet.removeSpaceDelegation.selector);
    addSelector(SpaceDelegationFacet.getSpaceDelegation.selector);
    addSelector(SpaceDelegationFacet.getSpaceDelegationsByOperator.selector);
    addSelector(SpaceDelegationFacet.setRiverToken.selector);
    addSelector(SpaceDelegationFacet.getTotalDelegation.selector);
    addSelector(SpaceDelegationFacet.setMainnetDelegation.selector);
  }

  function initializer() public pure override returns (bytes4) {
    return SpaceDelegationFacet.__SpaceDelegation_init.selector;
  }

  function makeInitData(address riverToken) public pure returns (bytes memory) {
    return abi.encodeWithSelector(initializer(), riverToken);
  }

  function versionName() public pure override returns (string memory) {
    return "spaceDelegationFacet";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    SpaceDelegationFacet spaceDelegationFacet = new SpaceDelegationFacet();
    vm.stopBroadcast();
    return address(spaceDelegationFacet);
  }
}
