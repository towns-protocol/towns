//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "../libraries/DataTypes.sol";

interface ISpaceEntitlementModule {
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
