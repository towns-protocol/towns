//SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

// @title ICustomEntitlement
// @notice Interface for users to implement custom entitlement checks
interface ICustomEntitlement is IERC165 {
  /// @notice checks whether a user is has a given permission for a channel or a space
  /// @param user address of the user to check
  /// @return whether the user is entitled to the permission
  function isEntitled(address[] memory user) external view returns (bool);
}
