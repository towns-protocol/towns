// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IEntitlement} from "../../entitlements/IEntitlement.sol";
import {IRolesBase} from "./IRoles.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {StringSet} from "../../../utils/libraries/StringSet.sol";
import {Validator} from "../../../utils/libraries/Validator.sol";

// services
import {ChannelService} from "../channels/ChannelService.sol";
import {EntitlementsManagerService} from "../entitlements/EntitlementsManagerService.sol";
import {RolesStorage} from "./RolesStorage.sol";

abstract contract RolesBase is IRolesBase {
    using EnumerableSet for EnumerableSet.UintSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using EnumerableSet for EnumerableSet.AddressSet;
    using CustomRevert for bytes4;
    using StringSet for StringSet.Set;
    using RolesStorage for RolesStorage.Role;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                            ROLE                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _createRole(
        string calldata roleName,
        string[] calldata permissions,
        CreateEntitlement[] calldata entitlements
    ) internal returns (uint256 roleId) {
        Validator.checkLengthCalldata(roleName, 2);

        uint256 entitlementsLen = entitlements.length;

        IEntitlement[] memory entitlementAddresses = new IEntitlement[](entitlementsLen);

        RolesStorage.Layout storage rs = RolesStorage.layout();

        roleId = ++rs.roleCount;

        for (uint256 i; i < entitlementsLen; ++i) {
            CreateEntitlement calldata entitlement = entitlements[i];
            EntitlementsManagerService.validateEntitlement(address(entitlement.module));
            entitlementAddresses[i] = entitlement.module;

            // check for empty address or data
            Validator.checkLengthCalldata(entitlement.data);

            EntitlementsManagerService.proxyAddRoleToEntitlement(
                address(entitlement.module),
                roleId,
                entitlement.data
            );
        }

        rs.roles.add(roleId);

        RolesStorage.Role storage role = rs.roleById[roleId];
        role.add(roleName, false, permissions, entitlementAddresses);

        emit RoleCreated(msg.sender, roleId);
    }

    function _getRoles() internal view returns (Role[] memory roles) {
        uint256[] memory roleIds = _getRoleIds();
        uint256 roleIdLen = roleIds.length;

        roles = new Role[](roleIdLen);

        for (uint256 i; i < roleIdLen; ++i) {
            (
                string memory name,
                bool isImmutable,
                string[] memory permissions,
                IEntitlement[] memory entitlements
            ) = _getRole(roleIds[i]);

            roles[i] = Role({
                id: roleIds[i],
                name: name,
                disabled: isImmutable,
                permissions: permissions,
                entitlements: entitlements
            });
        }
    }

    function _getRolesWithPermission(
        string memory permission
    ) internal view returns (Role[] memory) {
        uint256[] memory roleIds = _getRoleIds();
        uint256 roleIdLen = roleIds.length;
        Role[] memory rolesWithPermission = new Role[](roleIdLen);
        uint256 count = 0;

        bytes32 requestedPermission = keccak256(bytes(permission));

        for (uint256 i; i < roleIdLen; ++i) {
            (
                string memory name,
                bool isImmutable,
                string[] memory permissions,
                IEntitlement[] memory entitlements
            ) = _getRole(roleIds[i]);

            for (uint256 j; j < permissions.length; ++j) {
                if (keccak256(bytes(permissions[j])) == requestedPermission) {
                    rolesWithPermission[count] = Role({
                        id: roleIds[i],
                        name: name,
                        disabled: isImmutable,
                        permissions: permissions,
                        entitlements: entitlements
                    });
                    ++count;
                    break;
                }
            }
        }

        // Resize the array to remove unused slots
        assembly {
            mstore(rolesWithPermission, count)
        }

        return rolesWithPermission;
    }

    function _getRoleById(uint256 roleId) internal view returns (Role memory role) {
        (
            string memory name,
            bool isImmutable,
            string[] memory permissions,
            IEntitlement[] memory entitlements
        ) = _getRole(roleId);

        return
            Role({
                id: roleId,
                name: name,
                disabled: isImmutable,
                permissions: permissions,
                entitlements: entitlements
            });
    }

    // make nonreentrant
    function _updateRole(
        uint256 roleId,
        string calldata roleName,
        string[] calldata permissions,
        CreateEntitlement[] calldata entitlements
    ) internal {
        // check role exists
        _checkRoleExists(roleId);

        RolesStorage.Role storage role = RolesStorage.layout().roleById[roleId];

        if (role.isImmutable) Roles__RoleIsImmutable.selector.revertWith();

        // get current entitlements before updating them
        IEntitlement[] memory currentEntitlements = role.getEntitlements();
        uint256 currentEntitlementsLen = currentEntitlements.length;

        uint256 entitlementsLen = entitlements.length;
        IEntitlement[] memory entitlementAddresses = new IEntitlement[](entitlementsLen);

        for (uint256 i; i < entitlementsLen; ++i) {
            address module = address(entitlements[i].module);
            EntitlementsManagerService.validateEntitlement(module);
            EntitlementsManagerService.checkEntitlement(module);
            entitlementAddresses[i] = IEntitlement(module);
        }

        // Update the role name
        if (bytes(roleName).length > 0) {
            role.name = roleName;
        }

        // Update permissions
        if (permissions.length > 0) {
            // Remove all the current permissions
            role.permissions.clear();

            // Add all the new permissions
            role.addPermissions(permissions);
        }

        if (entitlementsLen == 0) return;

        for (uint256 i; i < currentEntitlementsLen; ++i) {
            role.removeEntitlement(address(currentEntitlements[i]));
        }

        // Add all the new entitlements
        for (uint256 i; i < entitlementsLen; ++i) {
            role.addEntitlement(address(entitlementAddresses[i]));
        }

        // loop through old entitlements and remove them
        for (uint256 i; i < currentEntitlementsLen; ++i) {
            // fetch entitlement data and if it's not empty, remove it
            bytes memory entitlementData = IEntitlement(currentEntitlements[i])
                .getEntitlementDataByRoleId(roleId);

            if (entitlementData.length > 0) {
                EntitlementsManagerService.proxyRemoveRoleFromEntitlement(
                    address(currentEntitlements[i]),
                    roleId
                );
            }
        }

        for (uint256 i; i < entitlementsLen; ++i) {
            CreateEntitlement calldata entitlement = entitlements[i];

            // check for empty address or data
            Validator.checkLengthCalldata(entitlement.data);

            EntitlementsManagerService.proxyAddRoleToEntitlement(
                address(entitlement.module),
                roleId,
                entitlement.data
            );
        }

        emit RoleUpdated(msg.sender, roleId);
    }

    function _removeRole(uint256 roleId) internal {
        // check role exists
        _checkRoleExists(roleId);

        RolesStorage.Layout storage rs = RolesStorage.layout();
        RolesStorage.Role storage role = rs.roleById[roleId];

        // get current entitlements
        IEntitlement[] memory currentEntitlements = role.getEntitlements();

        role.remove();

        rs.roles.remove(roleId);

        bytes32[] memory channelIds = ChannelService.getChannelIdsByRole(roleId);
        uint256 channelIdsLen = channelIds.length;

        // remove role from channels
        for (uint256 i; i < channelIdsLen; ++i) {
            ChannelService.removeRoleFromChannel(channelIds[i], roleId);
        }

        // remove role from entitlements
        uint256 currentEntitlementsLen = currentEntitlements.length;
        for (uint256 i; i < currentEntitlementsLen; ++i) {
            EntitlementsManagerService.proxyRemoveRoleFromEntitlement(
                address(currentEntitlements[i]),
                roleId
            );
        }

        emit RoleRemoved(msg.sender, roleId);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     CHANNEL PERMISSIONS                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _getChannelPermissionOverrides(
        uint256 roleId,
        bytes32 channelId
    ) internal view returns (string[] memory permissions) {
        // check role exists
        _checkRoleExists(roleId);

        // check channel exists
        ChannelService.checkChannelExists(channelId);

        return RolesStorage.layout().permissionOverridesByRole[roleId][channelId].values();
    }

    function _setChannelPermissionOverrides(
        uint256 roleId,
        bytes32 channelId,
        string[] calldata permissions
    ) internal {
        // check if new permissions are not empty then add them
        uint256 permissionsLen = permissions.length;
        if (permissionsLen > 0) {
            // check role exists
            _checkRoleExists(roleId);

            ChannelService.checkChannelExists(channelId);

            RolesStorage.Layout storage rs = RolesStorage.layout();
            StringSet.Set storage permissionsSet = rs.permissionOverridesByRole[roleId][channelId];

            // remove current channel permissions
            permissionsSet.clear();

            for (uint256 i; i < permissionsLen; ++i) {
                _checkEmptyString(permissions[i]);
                permissionsSet.add(permissions[i]);
            }

            rs.channelOverridesByRole[roleId].add(channelId);

            emit PermissionsAddedToChannelRole(msg.sender, roleId, channelId);
        } else {
            _clearChannelPermissionOverrides(roleId, channelId);
        }
    }

    function _clearChannelPermissionOverrides(uint256 roleId, bytes32 channelId) internal {
        // check role exists
        _checkRoleExists(roleId);

        // check channel exists
        ChannelService.checkChannelExists(channelId);

        RolesStorage.Layout storage rs = RolesStorage.layout();
        StringSet.Set storage permissionsSet = rs.permissionOverridesByRole[roleId][channelId];

        permissionsSet.clear();

        rs.channelOverridesByRole[roleId].remove(channelId);

        emit PermissionsRemovedFromChannelRole(msg.sender, roleId, channelId);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          INTERNAL                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _checkRoleExists(uint256 roleId) internal view {
        // check that role exists
        if (!RolesStorage.layout().roles.contains(roleId)) {
            Roles__RoleDoesNotExist.selector.revertWith();
        }
    }

    function _getRole(
        uint256 roleId
    )
        internal
        view
        returns (
            string memory name,
            bool isImmutable,
            string[] memory permissions,
            IEntitlement[] memory entitlements
        )
    {
        RolesStorage.Role storage role = RolesStorage.layout().roleById[roleId];

        name = role.name;
        isImmutable = role.isImmutable;
        permissions = role.permissions.values();
        entitlements = role.getEntitlements();
    }

    function _getRoleIds() internal view returns (uint256[] memory roleIds) {
        return RolesStorage.layout().roles.values();
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      ROLE ENTITLEMENT                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _addRoleToEntitlement(
        uint256 roleId,
        CreateEntitlement calldata entitlement
    ) internal {
        // check role exists
        _checkRoleExists(roleId);

        // check entitlements exists
        EntitlementsManagerService.checkEntitlement(address(entitlement.module));

        // add entitlement to role
        RolesStorage.Role storage role = RolesStorage.layout().roleById[roleId];
        role.addEntitlement(address(entitlement.module));

        // set entitlement to role
        EntitlementsManagerService.proxyAddRoleToEntitlement(
            address(entitlement.module),
            roleId,
            entitlement.data
        );
    }

    function _removeRoleFromEntitlement(
        uint256 roleId,
        CreateEntitlement calldata entitlement
    ) internal {
        // check role exists
        _checkRoleExists(roleId);

        // check entitlements exists
        EntitlementsManagerService.checkEntitlement(address(entitlement.module));

        // remove entitlement from role
        RolesStorage.Role storage role = RolesStorage.layout().roleById[roleId];
        role.removeEntitlement(address(entitlement.module));

        // set entitlement to role
        EntitlementsManagerService.proxyRemoveRoleFromEntitlement(
            address(entitlement.module),
            roleId
        );
    }

    function _checkEmptyString(string calldata str) internal pure {
        if (bytes(str).length == 0) Roles__InvalidPermission.selector.revertWith();
    }
}
