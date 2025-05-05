// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IRolesBase} from "./IRoles.sol";
import {IEntitlement} from "src/spaces/entitlements/IEntitlement.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {StringSet} from "../../../utils/libraries/StringSet.sol";
import {Validator} from "../../../utils/libraries/Validator.sol";

// services
import {RolesStorage} from "./RolesStorage.sol";
import {ChannelService} from "src/spaces/facets/channels/ChannelService.sol";
import {EntitlementsManagerService} from "src/spaces/facets/entitlements/EntitlementsManagerService.sol";

abstract contract RolesBase is IRolesBase {
    using StringSet for StringSet.Set;
    using EnumerableSet for EnumerableSet.UintSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using EnumerableSet for EnumerableSet.AddressSet;

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

        roleId = _getNextRoleId();

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

        _addRole(roleName, false, permissions, entitlementAddresses);

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

        // get current entitlements before updating them
        IEntitlement[] memory currentEntitlements = _getEntitlementsByRole(role);
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
            _addPermissionsToRole(roleId, permissions);
        }

        if (entitlementsLen == 0) {
            return;
        }

        if (entitlementAddresses.length > 0) {
            uint256 entitlementAddressesLen = entitlementAddresses.length;

            for (uint256 i; i < currentEntitlementsLen; ++i) {
                _removeEntitlementFromRole(roleId, address(currentEntitlements[i]));
            }

            // Add all the new entitlements
            for (uint256 i; i < entitlementAddressesLen; ++i) {
                _addEntitlementToRole(roleId, address(entitlementAddresses[i]));
            }
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
        IEntitlement[] memory currentEntitlements = _getEntitlementsByRole(role);

        rs.roles.remove(roleId);

        role.name = "";
        role.isImmutable = false;
        role.permissions.clear();
        role.entitlements.clear();

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

    function _getNextRoleId() internal view returns (uint256 roleId) {
        RolesStorage.Layout storage rs = RolesStorage.layout();
        return rs.roleCount + 1;
    }

    function _checkRoleExists(uint256 roleId) internal view {
        // check that role exists
        if (!RolesStorage.layout().roles.contains(roleId)) {
            revert Roles__RoleDoesNotExist();
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
        entitlements = _getEntitlementsByRole(role);
    }

    function _getRoleIds() internal view returns (uint256[] memory roleIds) {
        return RolesStorage.layout().roles.values();
    }

    function _getEntitlementsByRole(
        RolesStorage.Role storage role
    ) internal view returns (IEntitlement[] memory res) {
        EnumerableSet.AddressSet storage entitlements = role.entitlements;
        address[] memory entitlementAddresses = entitlements.values();
        // directly cast the address array to IEntitlement array
        assembly ("memory-safe") {
            res := entitlementAddresses
        }
    }

    function _addRole(
        string calldata roleName,
        bool isImmutable,
        string[] calldata permissions,
        IEntitlement[] memory entitlements
    ) internal returns (uint256 roleId) {
        RolesStorage.Layout storage rs = RolesStorage.layout();

        roleId = ++rs.roleCount;

        rs.roles.add(roleId);
        RolesStorage.Role storage role = rs.roleById[roleId];
        role.name = roleName;
        role.isImmutable = isImmutable;

        _addPermissionsToRole(roleId, permissions);

        for (uint256 i; i < entitlements.length; ++i) {
            // if entitlement is empty, skip
            if (address(entitlements[i]) == address(0)) {
                revert Roles__InvalidEntitlementAddress();
            }

            role.entitlements.add(address(entitlements[i]));
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      ROLE PERMISSIONS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _addPermissionsToRole(uint256 roleId, string[] calldata permissions) internal {
        // check role exists
        _checkRoleExists(roleId);

        RolesStorage.Role storage role = RolesStorage.layout().roleById[roleId];

        uint256 permissionLen = permissions.length;
        for (uint256 i; i < permissionLen; ++i) {
            // if permission is empty, revert
            _checkEmptyString(permissions[i]);

            // if permission already exists, revert
            if (role.permissions.contains(permissions[i])) {
                revert Roles__PermissionAlreadyExists();
            }

            role.permissions.add(permissions[i]);
        }
    }

    function _removePermissionsFromRole(uint256 roleId, string[] calldata permissions) internal {
        // check role exists
        _checkRoleExists(roleId);

        RolesStorage.Role storage role = RolesStorage.layout().roleById[roleId];

        uint256 permissionLen = permissions.length;
        for (uint256 i; i < permissionLen; ++i) {
            // if permission is empty, revert
            _checkEmptyString(permissions[i]);

            if (!role.permissions.contains(permissions[i])) {
                revert Roles__PermissionDoesNotExist();
            }

            role.permissions.remove(permissions[i]);
        }
    }

    function _getPermissionsByRoleId(
        uint256 roleId
    ) internal view returns (string[] memory permissions) {
        (, , permissions, ) = _getRole(roleId);
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
        _addEntitlementToRole(roleId, address(entitlement.module));

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
        _removeEntitlementFromRole(roleId, address(entitlement.module));

        // set entitlement to role
        EntitlementsManagerService.proxyRemoveRoleFromEntitlement(
            address(entitlement.module),
            roleId
        );
    }

    function _checkEmptyString(string calldata str) internal pure {
        if (bytes(str).length == 0) {
            revert Roles__InvalidPermission();
        }
    }

    function _removeEntitlementFromRole(uint256 roleId, address entitlement) internal {
        RolesStorage.Role storage role = RolesStorage.layout().roleById[roleId];

        if (!role.entitlements.contains(entitlement)) {
            revert Roles__EntitlementDoesNotExist();
        }

        role.entitlements.remove(entitlement);
    }

    function _addEntitlementToRole(uint256 roleId, address entitlement) internal {
        RolesStorage.Role storage role = RolesStorage.layout().roleById[roleId];

        if (role.entitlements.contains(entitlement)) {
            revert Roles__EntitlementAlreadyExists();
        }

        role.entitlements.add(entitlement);
    }
}
