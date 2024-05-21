// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IEntitlementsManager} from "contracts/src/spaces/facets/entitlements/IEntitlementsManager.sol";

// libraries

// contracts
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {EntitlementsManager} from "contracts/src/spaces/facets/entitlements/EntitlementsManager.sol";

contract EntitlementsManagerHelper is FacetHelper {
  EntitlementsManager internal entitlements;

  constructor() {
    addSelector(IEntitlementsManager.addImmutableEntitlements.selector);
    addSelector(IEntitlementsManager.isEntitledToSpace.selector);
    addSelector(IEntitlementsManager.isEntitledToChannel.selector);
    addSelector(IEntitlementsManager.addEntitlementModule.selector);
    addSelector(IEntitlementsManager.removeEntitlementModule.selector);
    addSelector(IEntitlementsManager.getEntitlement.selector);
    addSelector(IEntitlementsManager.getEntitlements.selector);
  }
}
