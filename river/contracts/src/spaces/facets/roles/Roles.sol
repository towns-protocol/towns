// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IRoles} from "./IRoles.sol";

// libraries
import {Permissions} from "contracts/src/spaces/facets/Permissions.sol";

// contracts
import {RolesBase} from "./RolesBase.sol";
import {Entitled} from "../Entitled.sol";

contract Roles is IRoles, RolesBase, Entitled {
  /// @inheritdoc IRoles
  function createRole(
    string calldata roleName,
    string[] memory permissions,
    CreateEntitlement[] memory entitlements
  ) external override returns (uint256) {
    _validatePermission(Permissions.ModifySpaceSettings);
    return _createRole(roleName, permissions, entitlements);
  }

  /// @inheritdoc IRoles
  function getRoles() external view override returns (Role[] memory) {
    return _getRoles();
  }

  /// @inheritdoc IRoles
  function getRoleById(
    uint256 roleId
  ) external view override returns (Role memory) {
    _checkRoleExists(roleId);
    return _getRoleById(roleId);
  }

  /// @inheritdoc IRoles
  function updateRole(
    uint256 roleId,
    string calldata roleName,
    string[] memory permissions,
    CreateEntitlement[] memory entitlements
  ) external override {
    _validatePermission(Permissions.ModifySpaceSettings);
    _updateRole(roleId, roleName, permissions, entitlements);
  }

  /// @inheritdoc IRoles
  function removeRole(uint256 roleId) external override {
    _validatePermission(Permissions.ModifySpaceSettings);
    _removeRole(roleId);
  }

  // permissions
  /// @inheritdoc IRoles
  function addPermissionsToRole(
    uint256 roleId,
    string[] memory permissions
  ) external override {
    _validatePermission(Permissions.ModifySpaceSettings);
    _addPermissionsToRole(roleId, permissions);
  }

  /// @inheritdoc IRoles
  function removePermissionsFromRole(
    uint256 roleId,
    string[] memory permissions
  ) external override {
    _validatePermission(Permissions.ModifySpaceSettings);
    _removePermissionsFromRole(roleId, permissions);
  }

  /// @inheritdoc IRoles
  function getPermissionsByRoleId(
    uint256 roleId
  ) external view override returns (string[] memory permissions) {
    return _getPermissionsByRoleId(roleId);
  }

  // entitlements
  /// @inheritdoc IRoles
  function addRoleToEntitlement(
    uint256 roleId,
    CreateEntitlement memory entitlement
  ) external {
    _validatePermission(Permissions.ModifySpaceSettings);
    _addRoleToEntitlement(roleId, entitlement);
  }

  /// @inheritdoc IRoles
  function removeRoleFromEntitlement(
    uint256 roleId,
    CreateEntitlement memory entitlement
  ) external {
    _validatePermission(Permissions.ModifySpaceSettings);
    _removeRoleFromEntitlement(roleId, entitlement);
  }

  // custom channel permission overrides
  /// @inheritdoc IRoles
  function setChannelPermissionOverrides(
    uint256 roleId,
    bytes32 channelId,
    string[] memory permissions
  ) external {
    _validatePermission(Permissions.ModifySpaceSettings);
    _setChannelPermissionOverrides(roleId, channelId, permissions);
  }

  /// @inheritdoc IRoles
  function getChannelPermissionOverrides(
    uint256 roleId,
    bytes32 channelId
  ) external view returns (string[] memory permissions) {
    return _getChannelPermissionOverrides(roleId, channelId);
  }

  /// @inheritdoc IRoles
  function clearChannelPermissionOverrides(
    uint256 roleId,
    bytes32 channelId
  ) external {
    _validatePermission(Permissions.ModifySpaceSettings);
    _clearChannelPermissionOverrides(roleId, channelId);
  }
}
