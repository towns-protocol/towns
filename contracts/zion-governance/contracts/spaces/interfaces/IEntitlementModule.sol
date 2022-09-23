//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "../libraries/DataTypes.sol";

interface IEntitlementModule {
  /// @notice The name of the entitlement module
  function name() external view returns (string memory);

  /// @notice The description of the entitlement module
  function description() external view returns (string memory);

  /// @notice Checks if a user has access to space or room based on the entitlements it holds
  /// @param spaceId The id of the space
  /// @param roomId The id of the room
  /// @param userAddress The address of the user
  /// @param permission The type of permission to check
  /// @return bool representing if the user has access or not
  function isEntitled(
    uint256 spaceId,
    uint256 roomId,
    address userAddress,
    DataTypes.Permission memory permission
  ) external view returns (bool);

  function isTransitivelyEntitled(
    uint256 spaceId,
    uint256 roomId,
    address userAddress,
    uint256 roleId
  ) external view returns (bool);

  /// @notice Sets the entitlements for a space
  function setEntitlement(
    uint256 spaceId,
    uint256 roomId,
    uint256 roleId,
    bytes calldata entitlementData
  ) external;

  function getUserRoles(
    uint256 spaceId,
    uint256 roomId,
    address user
  ) external view returns (DataTypes.Role[] memory);

  /// @notice Removes the entitlements for a space
  function removeEntitlement(
    uint256 spaceId,
    uint256 roomId,
    uint256[] calldata _roleIds,
    bytes calldata entitlementData
  ) external;

  // function isBanned()
  // function ban();
}
