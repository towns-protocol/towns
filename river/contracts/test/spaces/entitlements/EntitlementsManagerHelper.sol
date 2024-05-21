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
    entitlements = new EntitlementsManager();

    bytes4[] memory selectors_ = new bytes4[](8);
    selectors_[0] = IEntitlementsManager.addImmutableEntitlements.selector;
    selectors_[1] = IEntitlementsManager.isEntitledToSpace.selector;
    selectors_[2] = IEntitlementsManager.isEntitledToChannel.selector;
    selectors_[3] = IEntitlementsManager.addEntitlementModule.selector;
    selectors_[4] = IEntitlementsManager.removeEntitlementModule.selector;
    selectors_[5] = IEntitlementsManager.getEntitlement.selector;
    selectors_[6] = IEntitlementsManager.getEntitlements.selector;
    selectors_[7] = IEntitlementsManager
      .getEntitlementDataByPermission
      .selector;
    addSelectors(selectors_);
  }

  function facet() public view override returns (address) {
    return address(entitlements);
  }

  function selectors() public view override returns (bytes4[] memory) {
    return functionSelectors;
  }

  function initializer() public pure override returns (bytes4) {
    return "";
  }
}
