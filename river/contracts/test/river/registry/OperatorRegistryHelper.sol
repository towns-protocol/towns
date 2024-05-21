// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// interfaces

// libraries

// helpers
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

// contracts
import {IOperatorRegistry} from "contracts/src/river/registry/facets/operator/IOperatorRegistry.sol";
import {OperatorRegistry} from "contracts/src/river/registry/facets/operator/OperatorRegistry.sol";

contract OperatorRegistryHelper is FacetHelper {
  constructor() {
    addSelector(IOperatorRegistry.approveOperator.selector);
    addSelector(IOperatorRegistry.isOperator.selector);
    addSelector(IOperatorRegistry.removeOperator.selector);
  }

  function initializer() public pure override returns (bytes4) {
    return OperatorRegistry.__OperatorRegistry_init.selector;
  }

  function makeInitData(
    address[] calldata operators
  ) public pure returns (bytes memory) {
    return abi.encodeWithSelector(initializer(), operators);
  }
}
