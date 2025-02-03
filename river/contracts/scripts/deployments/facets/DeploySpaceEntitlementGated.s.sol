// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {EntitlementGated} from "contracts/src/spaces/facets/gated/EntitlementGated.sol";
import {SpaceEntitlementGated} from "contracts/src/spaces/facets/xchain/SpaceEntitlementGated.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

contract DeploySpaceEntitlementGated is FacetHelper, Deployer {
  constructor() {
    addSelector(EntitlementGated.postEntitlementCheckResult.selector);
    addSelector(EntitlementGated.postEntitlementCheckResultV2.selector);
    addSelector(EntitlementGated.getRuleData.selector);
  }

  function versionName() public pure override returns (string memory) {
    return "spaceEntitlementGatedFacet";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    SpaceEntitlementGated facet = new SpaceEntitlementGated();
    vm.stopBroadcast();
    return address(facet);
  }
}
