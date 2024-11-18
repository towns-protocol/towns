// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IMainnetDelegationBase} from "./IMainnetDelegation.sol";
import {ICrossDomainMessenger} from "contracts/src/tokens/river/mainnet/delegation/ICrossDomainMessenger.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {SafeCastLib} from "solady/utils/SafeCastLib.sol";
import {MainnetDelegationStorage} from "./MainnetDelegationStorage.sol";

// contracts
import {IRewardsDistribution} from "contracts/src/base/registry/facets/distribution/v2/IRewardsDistribution.sol";

abstract contract MainnetDelegationBase is IMainnetDelegationBase {
  using EnumerableSet for EnumerableSet.AddressSet;

  function _removeDelegation(address delegator) internal {
    MainnetDelegationStorage.Layout storage ds = MainnetDelegationStorage
      .layout();

    ds.delegators.remove(delegator);
    address currentOperator = ds.delegationByDelegator[delegator].operator;
    ds.delegatorsByOperator[currentOperator].remove(delegator);
    delete ds.delegationByDelegator[delegator];

    _unstake(delegator);

    emit DelegationRemoved(delegator);
  }

  /// @dev Caller must ensure that operator != address(0)
  function _replaceDelegation(
    Delegation storage delegation,
    address currentOperator,
    address delegator,
    address operator,
    uint256 quantity
  ) internal {
    MainnetDelegationStorage.Layout storage ds = MainnetDelegationStorage
      .layout();

    if (currentOperator != operator) {
      ds.delegatorsByOperator[currentOperator].remove(delegator);
      ds.delegatorsByOperator[operator].add(delegator);
      delegation.operator = operator;
      delegation.delegationTime = block.timestamp;
    } else if (delegation.quantity != quantity) {
      delegation.delegationTime = block.timestamp;
    }
    delegation.quantity = quantity;

    _unstake(delegator);
    _stake(delegator, operator, quantity);

    emit DelegationSet(delegator, operator, quantity);
  }

  function _addDelegation(
    Delegation storage delegation,
    address delegator,
    address operator,
    uint256 quantity
  ) internal {
    MainnetDelegationStorage.Layout storage ds = MainnetDelegationStorage
      .layout();

    ds.delegators.add(delegator);
    ds.delegatorsByOperator[operator].add(delegator);
    (
      delegation.operator,
      delegation.quantity,
      delegation.delegator,
      delegation.delegationTime
    ) = (operator, quantity, delegator, block.timestamp);

    _stake(delegator, operator, quantity);

    emit DelegationSet(delegator, operator, quantity);
  }

  function _setDelegation(
    address delegator,
    address operator,
    uint256 quantity
  ) internal {
    MainnetDelegationStorage.Layout storage ds = MainnetDelegationStorage
      .layout();

    Delegation storage delegation = ds.delegationByDelegator[delegator];
    address currentOperator = delegation.operator;

    if (operator == address(0) || quantity == 0) {
      _removeDelegation(delegator);
    } else if (currentOperator == address(0)) {
      _addDelegation(delegation, delegator, operator, quantity);
    } else {
      _replaceDelegation(
        delegation,
        currentOperator,
        delegator,
        operator,
        quantity
      );
    }
  }

  /// @dev Reuse the staking deposit if exists, otherwise create a new one
  function _stake(
    address delegator,
    address operator,
    uint256 quantity
  ) internal {
    MainnetDelegationStorage.Layout storage ds = MainnetDelegationStorage
      .layout();

    uint256 depositId = ds.depositIdByDelegator[delegator];
    if (depositId == 0) {
      depositId = IRewardsDistribution(address(this)).stake(
        SafeCastLib.toUint96(quantity),
        operator,
        delegator
      );
      ds.depositIdByDelegator[delegator] = depositId;
    } else {
      IRewardsDistribution(address(this)).redelegate(depositId, operator);
      IRewardsDistribution(address(this)).increaseStake(
        depositId,
        SafeCastLib.toUint96(quantity)
      );
    }
  }

  /// @dev Unstake the delegation of the delegator if exists
  function _unstake(address delegator) internal {
    MainnetDelegationStorage.Layout storage ds = MainnetDelegationStorage
      .layout();

    uint256 depositId = ds.depositIdByDelegator[delegator];
    if (depositId != 0) {
      IRewardsDistribution(address(this)).initiateWithdraw(depositId);
      // do not reset depositIdByDelegator[delegator] as we recycle deposit IDs for delegators
    }
  }

  function _getDepositIdByDelegator(
    address delegator
  ) internal view returns (uint256) {
    return MainnetDelegationStorage.layout().depositIdByDelegator[delegator];
  }

  function _getDelegationByDelegator(
    address delegator
  ) internal view returns (Delegation memory) {
    return MainnetDelegationStorage.layout().delegationByDelegator[delegator];
  }

  function _getMainnetDelegationsByOperator(
    address operator
  ) internal view returns (Delegation[] memory) {
    MainnetDelegationStorage.Layout storage ds = MainnetDelegationStorage
      .layout();
    EnumerableSet.AddressSet storage delegators = ds.delegatorsByOperator[
      operator
    ];
    uint256 length = delegators.length();
    Delegation[] memory delegations = new Delegation[](length);

    for (uint256 i; i < length; ++i) {
      address delegator = delegators.at(i);
      delegations[i] = ds.delegationByDelegator[delegator];
    }

    return delegations;
  }

  function _getDelegatedStakeByOperator(
    address operator
  ) internal view returns (uint256) {
    uint256 stake = 0;
    Delegation[] memory delegations = _getMainnetDelegationsByOperator(
      operator
    );
    for (uint256 i; i < delegations.length; ++i) {
      stake += delegations[i].quantity;
    }
    return stake;
  }

  function _setAuthorizedClaimer(address delegator, address claimer) internal {
    MainnetDelegationStorage.Layout storage ds = MainnetDelegationStorage
      .layout();

    address currentClaimer = ds.claimerByDelegator[delegator];
    if (currentClaimer != claimer) {
      ds.delegatorsByAuthorizedClaimer[currentClaimer].remove(delegator);
      ds.claimerByDelegator[delegator] = claimer;
      if (claimer != address(0)) {
        ds.delegatorsByAuthorizedClaimer[claimer].add(delegator);
      }
    }
  }

  function _getDelegatorsByAuthorizedClaimer(
    address claimer
  ) internal view returns (address[] memory) {
    MainnetDelegationStorage.Layout storage ds = MainnetDelegationStorage
      .layout();
    return ds.delegatorsByAuthorizedClaimer[claimer].values();
  }

  function _getAuthorizedClaimer(
    address owner
  ) internal view returns (address) {
    return MainnetDelegationStorage.layout().claimerByDelegator[owner];
  }

  function _setProxyDelegation(address proxyDelegation) internal {
    MainnetDelegationStorage.layout().proxyDelegation = proxyDelegation;
  }

  function _getProxyDelegation() internal view returns (address) {
    return MainnetDelegationStorage.layout().proxyDelegation;
  }

  function _setMessenger(ICrossDomainMessenger messenger) internal {
    MainnetDelegationStorage.layout().messenger = messenger;
  }

  function _getMessenger() internal view returns (ICrossDomainMessenger) {
    return MainnetDelegationStorage.layout().messenger;
  }
}
