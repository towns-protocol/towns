//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "../libraries/DataTypes.sol";

interface ISpaceEntitlementModule {
  /// @notice The name of the entitlement module
  function name() external view returns (string memory);

  /// @notice The description of the entitlement module
  function description() external view returns (string memory);

  /// @notice Sets the entitlements for a space
  /// @param vars struct containing the spaceId, roomId, entitlementType and data
  function setEntitlement(DataTypes.SetEntitlementData calldata vars)
    external
    returns (bytes memory);

  // function removeEntitlement(DataTypes.RemoveEntitlementData calldata vars)

  /// @notice Checks if a user has access to space or room based on the entitlements it holds
  /// @param spaceId The id of the space
  /// @param roomId The id of the room
  /// @param userAddress The address of the user
  /// @param entitlementType The type of entitlement to check
  /// @return bool representing if the user has access or not
  function isEntitled(
    uint256 spaceId,
    uint256 roomId,
    address userAddress,
    DataTypes.EntitlementType entitlementType
  ) external view returns (bool);
}
