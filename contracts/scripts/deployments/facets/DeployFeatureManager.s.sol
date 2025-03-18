// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {FeatureFacet} from "contracts/src/base/registry/facets/feature/FeatureFacet.sol";

contract DeployFeatureManager is Deployer, FacetHelper {
  // FacetHelper
  constructor() {
    addSelector(FeatureFacet.setFeatureCondition.selector);
    addSelector(FeatureFacet.getFeatureCondition.selector);
    addSelector(FeatureFacet.checkFeatureCondition.selector);
  }

  // Deploying
  function versionName() public pure override returns (string memory) {
    return "featureFacet";
  }

  function initializer() public pure override returns (bytes4) {
    return FeatureFacet.__FeatureFacet_init.selector;
  }

  function makeInitData(address token) public pure returns (bytes memory) {
    return abi.encodeWithSelector(initializer(), token);
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    FeatureFacet featureFacet = new FeatureFacet();
    vm.stopBroadcast();
    return address(featureFacet);
  }
}
