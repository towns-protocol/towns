// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./../libraries/DataTypes.sol";

abstract contract ZionSpaceManagerStorage {
  /// @notice variable representing the current total amount of spaces in the contract
  uint256 internal _spacesCounter;

  /// @notice Mapping representing the space id by network hash
  mapping(bytes32 => uint256) internal _spaceIdByHash;

  /// @notice Mapping representing the channel id by space id by network hash
  mapping(uint256 => mapping(bytes32 => uint256))
    internal _channelIdBySpaceIdByHash;

  /// @notice Mapping representing the channel data by spaceId by channel hash
  mapping(uint256 => mapping(uint256 => DataTypes.Channel))
    internal _channelBySpaceIdByChannelId;

  /// @notice mapping representing the space data by id
  mapping(uint256 => DataTypes.Space) internal _spaceById;

  /// @notice mapping representing the role data by space id
  mapping(uint256 => DataTypes.Roles) internal _rolesBySpaceId;

  /// @notice mapping representing the channel data by space id
  mapping(uint256 => DataTypes.Channels) internal _channelsBySpaceId;

  /// @notice mapping representing the entitlements modules by space id
  mapping(uint256 => address[]) internal _entitlementModulesBySpaceId;

  /// @notice mapping representing the permission data by space id by role id
  mapping(uint256 => mapping(uint256 => DataTypes.Permission[]))
    internal _permissionsBySpaceIdByRoleId;

  /// @notice mapping representing the role data by space id by channel id
  mapping(uint256 => mapping(uint256 => DataTypes.Role[]))
    internal _rolesBySpaceIdByChannelId;
}
