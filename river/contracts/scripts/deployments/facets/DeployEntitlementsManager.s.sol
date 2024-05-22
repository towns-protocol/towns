// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {EntitlementsManager} from "contracts/src/spaces/facets/entitlements/EntitlementsManager.sol";

contract DeployEntitlementsManager is FacetHelper, Deployer {
  constructor() {
    addSelector(EntitlementsManager.addImmutableEntitlements.selector);
    addSelector(EntitlementsManager.addEntitlementModule.selector);
    addSelector(EntitlementsManager.removeEntitlementModule.selector);
    addSelector(EntitlementsManager.getEntitlements.selector);
    addSelector(EntitlementsManager.getEntitlement.selector);
    addSelector(EntitlementsManager.isEntitledToSpace.selector);
    addSelector(EntitlementsManager.isEntitledToChannel.selector);
  }

  function versionName() public pure override returns (string memory) {
    return "entitlementsManager";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    EntitlementsManager facet = new EntitlementsManager();
    vm.stopBroadcast();
    return address(facet);
  }
}
