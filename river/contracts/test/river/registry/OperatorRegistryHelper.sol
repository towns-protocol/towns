// SPDX-License-Identifier: Apache-2.0
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
    bytes4[] memory selectors_ = new bytes4[](3);
    selectors_[_index++] = IOperatorRegistry.approveOperator.selector;
    selectors_[_index++] = IOperatorRegistry.isOperator.selector;
    selectors_[_index++] = IOperatorRegistry.removeOperator.selector;
    addSelectors(selectors_);
  }

  function facet() public pure override returns (address) {
    return address(0);
  }

  function selectors() public view override returns (bytes4[] memory) {
    return functionSelectors;
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
