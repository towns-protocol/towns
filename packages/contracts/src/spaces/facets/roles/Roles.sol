// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IRoles} from "./IRoles.sol";

// libraries
import {StringSet} from "../../../utils/libraries/StringSet.sol";
import {Permissions} from "../Permissions.sol";
import {RolesStorage} from "./RolesStorage.sol";

// contracts
import {Entitled} from "../Entitled.sol";
import {RolesBase} from "./RolesBase.sol";

contract Roles is IRoles, RolesBase, Entitled {
    using StringSet for StringSet.Set;
    using RolesStorage for RolesStorage.Role;

    /// @inheritdoc IRoles
    function createRole(
        string calldata roleName,
        string[] calldata permissions,
        CreateEntitlement[] calldata entitlements
    ) external override returns (uint256) {
        _validatePermission(Permissions.ModifySpaceSettings);
        return _createRole(roleName, permissions, entitlements);
    }

    /// @inheritdoc IRoles
    function getRoles() external view override returns (Role[] memory) {
        return _getRoles();
    }

    /// @inheritdoc IRoles
    function getRoleById(uint256 roleId) external view override returns (Role memory) {
        _checkRoleExists(roleId);
        return _getRoleById(roleId);
    }

    /// @inheritdoc IRoles
    function updateRole(
        uint256 roleId,
        string calldata roleName,
        string[] calldata permissions,
        CreateEntitlement[] calldata entitlements
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
    function addPermissionsToRole(uint256 roleId, string[] calldata permissions) external override {
        _validatePermission(Permissions.ModifySpaceSettings);
        _checkRoleExists(roleId);
        RolesStorage.layout().roleById[roleId].addPermissions(permissions);
    }

    /// @inheritdoc IRoles
    function removePermissionsFromRole(
        uint256 roleId,
        string[] calldata permissions
    ) external override {
        _validatePermission(Permissions.ModifySpaceSettings);
        _checkRoleExists(roleId);
        RolesStorage.layout().roleById[roleId].removePermissions(permissions);
    }

    /// @inheritdoc IRoles
    function getPermissionsByRoleId(
        uint256 roleId
    ) external view override returns (string[] memory permissions) {
        permissions = RolesStorage.layout().roleById[roleId].permissions.values();
    }

    // entitlements
    /// @inheritdoc IRoles
    function addRoleToEntitlement(uint256 roleId, CreateEntitlement calldata entitlement) external {
        _validatePermission(Permissions.ModifySpaceSettings);
        _addRoleToEntitlement(roleId, entitlement);
    }

    /// @inheritdoc IRoles
    function removeRoleFromEntitlement(
        uint256 roleId,
        CreateEntitlement calldata entitlement
    ) external {
        _validatePermission(Permissions.ModifySpaceSettings);
        _removeRoleFromEntitlement(roleId, entitlement);
    }

    // custom channel permission overrides
    /// @inheritdoc IRoles
    function setChannelPermissionOverrides(
        uint256 roleId,
        bytes32 channelId,
        string[] calldata permissions
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
    function clearChannelPermissionOverrides(uint256 roleId, bytes32 channelId) external {
        _validatePermission(Permissions.ModifySpaceSettings);
        _clearChannelPermissionOverrides(roleId, channelId);
    }
}
