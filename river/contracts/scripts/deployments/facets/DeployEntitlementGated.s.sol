// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {EntitlementGated} from "contracts/src/spaces/facets/gated/EntitlementGated.sol";

contract DeployEntitlementGated is FacetHelper, Deployer {
  constructor() {
    addSelector(EntitlementGated.postEntitlementCheckResult.selector);
    addSelector(EntitlementGated.getRuleData.selector);
  }

  function initializer() public pure override returns (bytes4) {
    return EntitlementGated.__EntitlementGated_init.selector;
  }

  function versionName() public pure override returns (string memory) {
    return "entitlementGated";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    EntitlementGated facet = new EntitlementGated();
    vm.stopBroadcast();
    return address(facet);
  }
}
