// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IOperatorRegistry} from "./IOperatorRegistry.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {RiverRegistryErrors} from "contracts/src/river/registry/libraries/RegistryErrors.sol";

// contracts
import {RegistryModifiers} from "contracts/src/river/registry/libraries/RegistryStorage.sol";
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

contract OperatorRegistry is
  IOperatorRegistry,
  RegistryModifiers,
  OwnableBase,
  Facet
{
  using EnumerableSet for EnumerableSet.AddressSet;

  function __OperatorRegistry_init(
    address[] calldata initialOperators
  ) external onlyInitializing {
    for (uint256 i = 0; i < initialOperators.length; ++i) {
      _approveOperator(initialOperators[i]);
    }
  }

  // =============================================================
  //                           Operators
  // =============================================================
  function approveOperator(address operator) external onlyOwner {
    _approveOperator(operator);
  }

  function isOperator(address operator) external view returns (bool) {
    return ds.operators.contains(operator);
  }

  function removeOperator(address operator) external onlyOwner {
    if (!ds.operators.contains(operator))
      revert(RiverRegistryErrors.OPERATOR_NOT_FOUND);

    // verify that the operator has no nodes attached
    for (uint256 i = 0; i < ds.nodes.length(); ++i) {
      if (ds.nodeByAddress[ds.nodes.at(i)].operator == operator)
        revert(RiverRegistryErrors.OUT_OF_BOUNDS);
    }

    ds.operators.remove(operator);

    emit OperatorRemoved(operator);
  }

  // =============================================================
  //                           Internal
  // =============================================================

  function _approveOperator(address operator) internal {
    // Validate operator address
    if (operator == address(0)) revert(RiverRegistryErrors.BAD_ARG);

    if (ds.operators.contains(operator))
      revert(RiverRegistryErrors.ALREADY_EXISTS);

    ds.operators.add(operator);

    emit OperatorAdded(operator);
  }
}
