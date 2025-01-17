// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface IVotesEnumerable {
  /// @notice Get all delegators who have delegated their voting power
  /// @return Array of delegator addresses
  function getDelegators() external view returns (address[] memory);

  /// @notice Get the total number of delegators
  /// @return Total number of delegators
  function getDelegatorsCount() external view returns (uint256);

  /// @notice Get a paginated list of delegators
  /// @param cursor The starting index for pagination
  /// @param size The number of delegators to return
  /// @return delegators Array of delegator addresses for the requested page
  /// @return next The cursor for the next page, returns 0 if no more pages
  function getPaginatedDelegators(
    uint256 cursor,
    uint256 size
  ) external view returns (address[] memory delegators, uint256 next);

  /// @notice Get all delegators who have delegated their voting power to a specific account
  /// @param account The delegatee address to get delegators for
  /// @return Array of delegator addresses who delegated to the specified account
  function getDelegatorsByDelegatee(
    address account
  ) external view returns (address[] memory);

  /// @notice Get the timestamp when a delegator last delegated their voting power
  /// @param account The delegator address to get delegation time for
  /// @return Timestamp of the last delegation, returns 0 if never delegated
  function getDelegationTimeForDelegator(
    address account
  ) external view returns (uint256);
}
