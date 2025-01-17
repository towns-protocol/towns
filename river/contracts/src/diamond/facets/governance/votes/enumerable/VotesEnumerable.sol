// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IVotesEnumerable} from "contracts/src/diamond/facets/governance/votes/enumerable/IVotesEnumerable.sol";

// libraries
import {VotesEnumerableLib} from "contracts/src/diamond/facets/governance/votes/enumerable/VotesEnumerableLib.sol";

// contracts
abstract contract VotesEnumerable is IVotesEnumerable {
  /// @inheritdoc IVotesEnumerable
  function getDelegators() external view returns (address[] memory) {
    return VotesEnumerableLib.getDelegators();
  }

  /// @inheritdoc IVotesEnumerable
  function getDelegatorsCount() external view returns (uint256) {
    return VotesEnumerableLib.getDelegatorsCount();
  }

  /// @inheritdoc IVotesEnumerable
  function getPaginatedDelegators(
    uint256 cursor,
    uint256 size
  ) external view returns (address[] memory delegators, uint256 next) {
    return VotesEnumerableLib.getPaginatedDelegators(cursor, size);
  }

  /// @inheritdoc IVotesEnumerable
  function getDelegatorsByDelegatee(
    address delegatee
  ) external view returns (address[] memory) {
    return VotesEnumerableLib.getDelegatorsByDelegatee(delegatee);
  }

  /// @inheritdoc IVotesEnumerable
  function getDelegationTimeForDelegator(
    address delegator
  ) external view returns (uint256) {
    return VotesEnumerableLib.getDelegationTimeForDelegator(delegator);
  }
}
