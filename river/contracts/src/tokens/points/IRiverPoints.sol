// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IRiverPointsBase {
  enum Action {
    JoinSpace,
    RubBelly
  }

  error RiverPoints__InvalidSpace();
  error RiverPoints__InvalidArrayLength();
}

interface IRiverPoints is IRiverPointsBase {
  /// @notice Batch mint points to multiple users
  /// @dev Only callable by the owner
  /// @param accounts The addresses to mint the points to
  /// @param values The amounts of points to mint
  function batchMintPoints(
    address[] calldata accounts,
    uint256[] calldata values
  ) external;

  /// @notice Mint points to a user
  /// @dev Only spaces can mint points
  /// @param to The address to mint the points to
  /// @param value The amount of points to mint
  function mint(address to, uint256 value) external;

  /// @notice Get the points from an eligible action
  /// @param action The action to get the points from
  /// @param data The data of the action
  function getPoints(
    Action action,
    bytes calldata data
  ) external pure returns (uint256);
}
