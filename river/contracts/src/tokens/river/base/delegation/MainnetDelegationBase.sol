// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IMainnetDelegationBase} from "./IMainnetDelegation.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {MainnetDelegationStorage} from "./MainnetDelegationStorage.sol";

// contracts

abstract contract MainnetDelegationBase is IMainnetDelegationBase {
  using EnumerableSet for EnumerableSet.AddressSet;

  function _setDelegation(
    address delegator,
    address operator,
    uint256 quantity
  ) internal {
    MainnetDelegationStorage.Layout storage ds = MainnetDelegationStorage
      .layout();

    if (delegator == address(0)) revert InvalidDelegator(delegator);
    if (operator == address(0)) revert InvalidOperator(operator);
    if (quantity == 0) revert InvalidQuantity(quantity);
    if (ds.delegationByDelegator[delegator].operator != address(0)) {
      revert DelegationAlreadySet(delegator, operator);
    }

    ds.delegatorsByOperator[operator].add(delegator);
    ds.delegationByDelegator[delegator] = Delegation(
      operator,
      quantity,
      delegator
    );
    emit DelegationSet(delegator, operator, quantity);
  }

  function _removeDelegation(address delegator) internal {
    MainnetDelegationStorage.Layout storage ds = MainnetDelegationStorage
      .layout();
    Delegation memory delegation = ds.delegationByDelegator[delegator];

    if (delegation.operator == address(0)) revert DelegationNotSet();

    ds.delegatorsByOperator[delegation.operator].remove(delegator);
    delete ds.delegationByDelegator[delegator];
    emit DelegationRemoved(delegator);
  }

  function _getDelegationByDelegator(
    address delegator
  ) internal view returns (Delegation memory) {
    return MainnetDelegationStorage.layout().delegationByDelegator[delegator];
  }

  function _getDelegationsByOperator(
    address operator
  ) internal view returns (Delegation[] memory) {
    MainnetDelegationStorage.Layout storage ds = MainnetDelegationStorage
      .layout();
    EnumerableSet.AddressSet storage delegators = ds.delegatorsByOperator[
      operator
    ];
    Delegation[] memory delegations = new Delegation[](delegators.length());

    for (uint256 i = 0; i < delegators.length(); i++) {
      address delegator = delegators.at(i);
      delegations[i] = ds.delegationByDelegator[delegator];
    }

    return delegations;
  }

  function _getDelegatedStakeByOperator(
    address operator
  ) internal view returns (uint256) {
    uint256 stake = 0;
    Delegation[] memory delegations = _getDelegationsByOperator(operator);
    for (uint256 i = 0; i < delegations.length; i++) {
      stake += delegations[i].quantity;
    }
    return stake;
  }
}
