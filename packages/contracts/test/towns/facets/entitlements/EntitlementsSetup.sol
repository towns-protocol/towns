// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IEntitlements} from "contracts/src/towns/facets/entitlements/IEntitlements.sol";

// libraries

// contracts
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {Entitlements} from "contracts/src/towns/facets/entitlements/Entitlements.sol";

contract EntitlementsHelper is FacetHelper {
  Entitlements internal entitlements;

  constructor() {
    entitlements = new Entitlements();
  }

  function deploy() public returns (address) {
    entitlements = new Entitlements();
    return address(entitlements);
  }

  function facet() public view override returns (address) {
    return address(entitlements);
  }

  function selectors() public pure override returns (bytes4[] memory) {
    bytes4[] memory selectors_ = new bytes4[](7);
    selectors_[0] = IEntitlements.addImmutableEntitlements.selector;
    selectors_[1] = IEntitlements.isEntitledToTown.selector;
    selectors_[2] = IEntitlements.isEntitledToChannel.selector;
    selectors_[3] = IEntitlements.addEntitlement.selector;
    selectors_[4] = IEntitlements.removeEntitlement.selector;
    selectors_[5] = IEntitlements.getEntitlement.selector;
    selectors_[6] = IEntitlements.getEntitlements.selector;
    return selectors_;
  }

  function initializer() public pure override returns (bytes4) {
    return "";
  }
}
