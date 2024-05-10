// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// helpers
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {NodeOperatorFacet} from "contracts/src/base/registry/facets/operator/NodeOperatorFacet.sol";

contract NodeOperatorHelper is FacetHelper {
  constructor() {
    addSelector(NodeOperatorFacet.registerOperator.selector);
    addSelector(NodeOperatorFacet.isOperator.selector);
    addSelector(NodeOperatorFacet.getOperatorStatus.selector);
    addSelector(NodeOperatorFacet.setOperatorStatus.selector);
    addSelector(NodeOperatorFacet.setCommissionRate.selector);
    addSelector(NodeOperatorFacet.getCommissionRate.selector);
    addSelector(NodeOperatorFacet.setClaimAddress.selector);
    addSelector(NodeOperatorFacet.getClaimAddress.selector);
  }

  function facet() public pure override returns (address) {
    return address(0);
  }

  function selectors() public view override returns (bytes4[] memory) {
    return functionSelectors;
  }

  function initializer() public pure override returns (bytes4) {
    return NodeOperatorFacet.__NodeOperator_init.selector;
  }
}
