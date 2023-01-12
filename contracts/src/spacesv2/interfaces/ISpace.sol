// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import {DataTypes} from "../libraries/DataTypes.sol";

interface ISpace {
  /// ***** Space Management *****
  function initialize(
    string memory name,
    string memory networkId,
    address[] memory modules
  ) external;

  function setSpaceAccess(bool disabled) external;

  function setOwnerRoleId(uint256 roleId) external;

  /// ***** Channel Management *****
  function getChannelByHash(
    bytes32 channelHash
  ) external view returns (DataTypes.Channel memory);

  function setChannelAccess(string calldata channelId, bool disabled) external;

  function createChannel(
    string memory channelName,
    string memory channelNetworkId,
    uint256[] memory roleIds
  ) external returns (bytes32);

  /// ***** Role Management *****
  function getRoles() external view returns (DataTypes.Role[] memory);

  function createRole(
    string memory roleName,
    string[] memory permissions,
    DataTypes.Entitlement[] memory entitlements
  ) external returns (uint256);

  function updateRole(uint256 roleId, string memory roleName) external;

  function removeRole(uint256 roleId) external;

  function getRoleById(
    uint256 roleId
  ) external view returns (DataTypes.Role memory);

  /// ***** Permission Management *****
  function addPermissionToRole(
    uint256 roleId,
    string memory permission
  ) external;

  function getPermissionsByRoleId(
    uint256 roleId
  ) external view returns (bytes32[] memory);

  function removePermissionFromRole(
    uint256 roleId,
    string memory permission
  ) external;

  /// ***** Entitlement Management *****
  function getEntitlementIdsByRoleId(
    uint256 roleId
  ) external view returns (bytes32[] memory);

  function isEntitledToChannel(
    string calldata channelId,
    address user,
    string calldata permission
  ) external view returns (bool);

  function isEntitledToSpace(
    address user,
    string calldata permission
  ) external view returns (bool);

  function getEntitlements() external view returns (address[] memory);

  function setEntitlement(address entitlement, bool whitelist) external;

  function removeRoleFromEntitlement(
    uint256 roleId,
    DataTypes.Entitlement memory entitlement
  ) external;

  function addRoleToChannel(
    string calldata channelId,
    address entitlement,
    uint256 roleId
  ) external;

  function addRoleToEntitlement(
    uint256 roleId,
    DataTypes.Entitlement memory entitlement
  ) external;

  function removeRoleFromChannel(
    string calldata channelId,
    address entitlement,
    uint256 roleId
  ) external;
}
