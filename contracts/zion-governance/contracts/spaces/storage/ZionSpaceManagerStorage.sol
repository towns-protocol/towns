// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./../libraries/DataTypes.sol";

abstract contract ZionSpaceManagerStorage {
  /// @notice variable representing the current total amount of spaces in the contract
  uint256 internal _spacesCounter;

  /// @notice variable representing the default entitlement module address and tag
  address internal _defaultEntitlementModuleAddress;
  string internal _defaultEntitlementModuleTag;

  // Storage
  /// @notice Mapping representing the space data by name.
  mapping(bytes32 => uint256) internal _spaceByNameHash;

  /// @notice Mapping representing the space data by id.
  mapping(uint256 => DataTypes.Space) internal _spaceById;

  /// @notice Mapping representing the space id by network id
  mapping(string => uint256) internal _spaceIdByNetworkId;
}
