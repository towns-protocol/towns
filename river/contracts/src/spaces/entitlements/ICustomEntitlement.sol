//SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// @title ICustomEntitlement
// @notice Interface for users to implement custom entitlement checks
interface ICustomEntitlement {
  /// @notice checks whether a user is has a given permission for a channel or a space
  /// @param user address of the user to check
  /// @return whether the user is entitled to the permission
  function isEntitled(address[] memory user) external view returns (bool);
}
