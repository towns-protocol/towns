// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IMainnetDelegationBase} from "./IMainnetDelegation.sol";
import {ICrossDomainMessenger} from "./ICrossDomainMessenger.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {SafeCastLib} from "solady/utils/SafeCastLib.sol";
import {MainnetDelegationStorage} from "./MainnetDelegationStorage.sol";

// contracts
import {IRewardsDistribution} from "contracts/src/base/registry/facets/distribution/v2/IRewardsDistribution.sol";

abstract contract MainnetDelegationBase is IMainnetDelegationBase {
  using EnumerableSet for EnumerableSet.AddressSet;

  function _setDelegationDigest(bytes32 digest) internal {
    MainnetDelegationStorage.layout().delegationDigest = digest;

    emit DelegationDigestSet(digest);
  }

  function _verifyDelegations(bytes calldata encodedMsgs) internal view {
    MainnetDelegationStorage.Layout storage ds = MainnetDelegationStorage
      .layout();

    bytes32 digest = keccak256(abi.encode(keccak256(encodedMsgs)));
    require(digest == ds.delegationDigest);
  }

  /// @dev equivalent: abi.decode(encodedMsgs, (DelegationMsg[]));
  function _decodeDelegations(
    bytes calldata encodedMsgs
  ) internal pure returns (DelegationMsg[] calldata msgs) {
    assembly {
      // this is a dynamic array, so calldataload(encodedMsgs.offset) is the
      // offset from encodedMsgs.offset at which the array begins
      let lengthPtr := add(encodedMsgs.offset, calldataload(encodedMsgs.offset))
      msgs.length := calldataload(lengthPtr)
      msgs.offset := add(lengthPtr, 0x20)
    }
  }

  function _relayDelegations(bytes calldata encodedMsgs) internal {
    _verifyDelegations(encodedMsgs);

    DelegationMsg[] calldata msgs = _decodeDelegations(encodedMsgs);

    // process the delegation messages
    for (uint256 i; i < msgs.length; ++i) {
      DelegationMsg calldata delegation = msgs[i];
      _setDelegation(
        delegation.delegator,
        delegation.delegatee,
        delegation.quantity
      );
      _setAuthorizedClaimer(delegation.delegator, delegation.claimer);
    }

    MainnetDelegationStorage.Layout storage ds = MainnetDelegationStorage
      .layout();

    address[] memory delegators = ds.delegators.values();

    // remove stale delegation if a delegator isn't in the encodedMsgs
    for (uint256 i; i < delegators.length; ++i) {
      address delegator = delegators[i];
      bool found;
      for (uint256 j; j < msgs.length; ++j) {
        if (msgs[j].delegator == delegator) {
          found = true;
          break;
        }
      }
      if (!found) {
        _removeDelegation(delegator);
      }
    }
  }

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
      (bool success, bytes memory retData) = address(this).call(
        abi.encodeCall(
          IRewardsDistribution.stake,
          (SafeCastLib.toUint96(quantity), operator, delegator)
        )
      );
      if (success) {
        depositId = abi.decode(retData, (uint256));
        ds.depositIdByDelegator[delegator] = depositId;
      }
    } else {
      (bool success, ) = address(this).call(
        abi.encodeCall(IRewardsDistribution.redelegate, (depositId, operator))
      );
      if (success) {
        IRewardsDistribution(address(this)).increaseStake(
          depositId,
          SafeCastLib.toUint96(quantity)
        );
      }
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
  ) internal view returns (Delegation memory delegation) {
    assembly ("memory-safe") {
      // By default, memory has been implicitly allocated for `delegation`.
      // But we don't need this implicitly allocated memory.
      // So we just set the free memory pointer to what it was before `delegation` has been allocated.
      mstore(0x40, delegation)
    }
    delegation = MainnetDelegationStorage.layout().delegationByDelegator[
      delegator
    ];
  }

  function _getMainnetDelegationsByOperator(
    address operator
  ) internal view returns (Delegation[] memory delegations) {
    MainnetDelegationStorage.Layout storage ds = MainnetDelegationStorage
      .layout();
    EnumerableSet.AddressSet storage delegators = ds.delegatorsByOperator[
      operator
    ];
    uint256 length = delegators.length();
    delegations = new Delegation[](length);

    for (uint256 i; i < length; ++i) {
      address delegator = delegators.at(i);
      delegations[i] = ds.delegationByDelegator[delegator];
    }
  }

  function _getDelegatedStakeByOperator(
    address operator
  ) internal view returns (uint256 stake) {
    Delegation[] memory delegations = _getMainnetDelegationsByOperator(
      operator
    );
    for (uint256 i; i < delegations.length; ++i) {
      stake += delegations[i].quantity;
    }
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

      emit ClaimerSet(delegator, claimer);
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
