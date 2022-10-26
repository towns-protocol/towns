// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "./../libraries/DataTypes.sol";

contract ZionRoleStorage {
  /// @notice mapping representing the role data by space id
  mapping(uint256 => DataTypes.Roles) internal _rolesBySpaceId;

  /// @notice mapping representing the permission data by space id by role id
  mapping(uint256 => mapping(uint256 => DataTypes.Permission[]))
    internal _permissionsBySpaceIdByRoleId;

  /// @notice mapping representing the role data by space id by channel id
  mapping(uint256 => mapping(uint256 => DataTypes.Role[]))
    internal _rolesBySpaceIdByChannelId;
}
