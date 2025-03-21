// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {FeatureManagerFacet} from "contracts/src/base/registry/facets/feature/FeatureManagerFacet.sol";

contract DeployFeatureManager is Deployer, FacetHelper {
  // FacetHelper
  constructor() {
    addSelector(FeatureManagerFacet.setFeatureCondition.selector);
    addSelector(FeatureManagerFacet.getFeatureCondition.selector);
    addSelector(FeatureManagerFacet.getFeatureConditions.selector);
    addSelector(FeatureManagerFacet.getFeatureConditionsForSpace.selector);
    addSelector(FeatureManagerFacet.checkFeatureCondition.selector);
    addSelector(FeatureManagerFacet.disableFeatureCondition.selector);
  }

  // Deploying
  function versionName() public pure override returns (string memory) {
    return "featureManagerFacet";
  }

  function initializer() public pure override returns (bytes4) {
    return FeatureManagerFacet.__FeatureManagerFacet_init.selector;
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    FeatureManagerFacet featureManagerFacet = new FeatureManagerFacet();
    vm.stopBroadcast();
    return address(featureManagerFacet);
  }
}
