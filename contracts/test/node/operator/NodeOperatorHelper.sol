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

    bytes4[] memory selectors_ = new bytes4[](20);
    selectors_[_index++] = NodeOperatorFacet.registerOperator.selector;
    selectors_[_index++] = NodeOperatorFacet.isOperator.selector;
    selectors_[_index++] = NodeOperatorFacet.setOperatorStatus.selector;
    selectors_[_index++] = NodeOperatorFacet.getOperatorStatus.selector;
    selectors_[_index++] = NodeOperatorFacet.getOperators.selector;
    selectors_[_index++] = NodeOperatorFacet.getOperatorsByStatus.selector;
    selectors_[_index++] = NodeOperatorFacet.getApprovedOperators.selector;
    selectors_[_index++] = NodeOperatorFacet.setRiverToken.selector;
    selectors_[_index++] = NodeOperatorFacet.riverToken.selector;
    selectors_[_index++] = NodeOperatorFacet.setMainnetDelegation.selector;
    selectors_[_index++] = NodeOperatorFacet.getMainnetDelegation.selector;
    selectors_[_index++] = NodeOperatorFacet.calculateStake.selector;
    selectors_[_index++] = NodeOperatorFacet.setStakeRequirement.selector;
    selectors_[_index++] = NodeOperatorFacet.getStakeRequirement.selector;
    selectors_[_index++] = NodeOperatorFacet.setSpaceOwnerRegistry.selector;
    selectors_[_index++] = NodeOperatorFacet.getSpaceOwnerRegistry.selector;
    selectors_[_index++] = NodeOperatorFacet.addSpaceDelegation.selector;
    selectors_[_index++] = NodeOperatorFacet.removeSpaceDelegation.selector;
    selectors_[_index++] = NodeOperatorFacet.getSpaceDelegation.selector;
    selectors_[_index++] = NodeOperatorFacet
      .getSpaceDelegationsByOperator
      .selector;

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

  function makeInitData(
    uint256 stakeRequirement
  ) public pure returns (bytes memory) {
    return abi.encodeWithSelector(initializer(), stakeRequirement);
  }
}
