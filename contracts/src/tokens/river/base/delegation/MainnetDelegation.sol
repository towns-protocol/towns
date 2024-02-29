// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IMainnetDelegation} from "contracts/src/tokens/river/base/delegation/IMainnetDelegation.sol";

// libraries

// contracts
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";
import {MainnetDelegationBase} from "contracts/src/tokens/river/base/delegation/MainnetDelegationBase.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

contract MainnetDelegation is
  IMainnetDelegation,
  MainnetDelegationBase,
  OwnableBase,
  Facet
{
  // =============================================================
  //                           Initializers
  // =============================================================
  function __MainnetDelegation_init() external onlyInitializing {
    __MainnetDelegation_init_unchained();
  }

  function __MainnetDelegation_init_unchained() internal {
    _addInterface(type(IMainnetDelegation).interfaceId);
  }

  // =============================================================
  //                           Delegation
  // =============================================================

  /// @inheritdoc IMainnetDelegation
  function setDelegation(
    address delegator,
    address operator,
    uint256 quantity
  ) external onlyOwner {
    _setDelegation(delegator, operator, quantity);
  }

  /// @inheritdoc IMainnetDelegation
  function removeDelegation(address delegator) external onlyOwner {
    _removeDelegation(delegator);
  }

  /// @inheritdoc IMainnetDelegation
  function getDelegationByDelegator(
    address delegator
  ) external view returns (Delegation memory) {
    return _getDelegationByDelegator(delegator);
  }

  /// @inheritdoc IMainnetDelegation
  function getDelegationsByOperator(
    address operator
  ) external view returns (Delegation[] memory) {
    return _getDelegationsByOperator(operator);
  }

  /// @inheritdoc IMainnetDelegation
  function getDelegatedStakeByOperator(
    address operator
  ) external view returns (uint256) {
    return _getDelegatedStakeByOperator(operator);
  }
}
