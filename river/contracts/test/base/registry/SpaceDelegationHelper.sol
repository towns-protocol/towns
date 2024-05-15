// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// helpers
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {SpaceDelegationFacet} from "contracts/src/base/registry/facets/delegation/SpaceDelegationFacet.sol";

contract SpaceDelegationHelper is FacetHelper {
  constructor() {
    addSelector(SpaceDelegationFacet.addSpaceDelegation.selector);
    addSelector(SpaceDelegationFacet.removeSpaceDelegation.selector);
    addSelector(SpaceDelegationFacet.getSpaceDelegation.selector);
    addSelector(SpaceDelegationFacet.getSpaceDelegationsByOperator.selector);
    addSelector(SpaceDelegationFacet.setRiverToken.selector);
  }

  function facet() public pure override returns (address) {
    return address(0);
  }

  function selectors() public view override returns (bytes4[] memory) {
    return functionSelectors;
  }

  function initializer() public pure override returns (bytes4) {
    return SpaceDelegationFacet.__SpaceDelegation_init.selector;
  }
}
