// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// helpers
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {NodeOperatorFacet} from "contracts/src/node/operator/NodeOperatorFacet.sol";

contract NodeOperatorHelper is FacetHelper {
  NodeOperatorFacet internal operator;

  constructor() {
    operator = new NodeOperatorFacet();

    bytes4[] memory selectors_ = new bytes4[](4);
    selectors_[0] = NodeOperatorFacet.registerOperator.selector;
    selectors_[1] = NodeOperatorFacet.setOperatorStatus.selector;
    selectors_[2] = NodeOperatorFacet.operatorStatus.selector;
    selectors_[3] = NodeOperatorFacet.approvedOperators.selector;

    addSelectors(selectors_);
  }

  function facet() public view override returns (address) {
    return address(operator);
  }

  function selectors() public view override returns (bytes4[] memory) {
    return functionSelectors;
  }

  function initializer() public pure override returns (bytes4) {
    return NodeOperatorFacet.__NodeOperator_init.selector;
  }
}
