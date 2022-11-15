//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "../libraries/DataTypes.sol";

interface IEntitlementModule {
  /// @notice The name of the entitlement module
  function name() external view returns (string memory);

  /// @notice The type of the entitlement module
  function moduleType() external view returns (string memory);

  /// @notice The description of the entitlement module
  function description() external view returns (string memory);

  /// @notice Checks if a user has access to space or channel based on the entitlements it holds
  /// @param spaceId The id of the space
  /// @param channelId The id of the channel
  /// @param userAddress The address of the user
  /// @param permission The type of permission to check
  /// @return bool representing if the user has access or not
  function isEntitled(
    uint256 spaceId,
    uint256 channelId,
    address userAddress,
    DataTypes.Permission memory permission
  ) external view returns (bool);

  /// @notice Sets a new entitlement for a space
  function setSpaceEntitlement(
    uint256 spaceId,
    uint256 roleId,
    bytes calldata entitlementData
  ) external;

  /// @notice Adds a roleId to a channel
  function addRoleIdToChannel(
    uint256 spaceId,
    uint256 channelId,
    uint256 roleId
  ) external;

  /// @notice Removes an entitlement from a space
  function removeSpaceEntitlement(
    uint256 spaceId,
    uint256 roleId,
    bytes calldata entitlementData
  ) external;

  /// @notice Removes  a roleId from a channel
  function removeRoleIdFromChannel(
    uint256 spaceId,
    uint256 channelId,
    uint256 roleId
  ) external;

  function getUserRoles(
    uint256 spaceId,
    address user
  ) external view returns (DataTypes.Role[] memory);
}
