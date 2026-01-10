// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IEntitlement} from "../../entitlements/IEntitlement.sol";
import {IRolesBase} from "./IRoles.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {StringSet} from "../../../utils/libraries/StringSet.sol";

// contracts

library RolesStorage {
    using EnumerableSet for EnumerableSet.AddressSet;
    using CustomRevert for bytes4;
    using StringSet for StringSet.Set;

    struct Role {
        string name;
        bool isImmutable;
        StringSet.Set permissions;
        EnumerableSet.AddressSet entitlements;
    }

    struct Layout {
        uint256 roleCount;
        EnumerableSet.UintSet roles;
        mapping(uint256 roleId => Role) roleById;
        // Overwrite permissions at a channel level given a role has been assigned to it
        mapping(uint256 roleId => EnumerableSet.Bytes32Set) channelOverridesByRole;
        mapping(uint256 roleId => mapping(bytes32 channelId => StringSet.Set)) permissionOverridesByRole;
    }

    // keccak256(abi.encode(uint256(keccak256("spaces.facets.roles.storage")) - 1)) &
    // ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x672ef851d5f92307da037116e23aa9e31af7e1f7e3ca62c4e6d540631df3fd00;

    function layout() internal pure returns (Layout storage ds) {
        assembly {
            ds.slot := STORAGE_SLOT
        }
    }

    function add(
        Role storage role,
        string calldata roleName,
        bool isImmutable,
        string[] calldata permissions,
        IEntitlement[] memory entitlements
    ) internal {
        role.name = roleName;
        role.isImmutable = isImmutable;

        addPermissions(role, permissions);

        for (uint256 i; i < entitlements.length; ++i) {
            // if entitlement is empty, skip
            if (address(entitlements[i]) == address(0)) {
                IRolesBase.Roles__InvalidEntitlementAddress.selector.revertWith();
            }

            role.entitlements.add(address(entitlements[i]));
        }
    }

    function remove(Role storage role) internal {
        role.name = "";
        role.isImmutable = false;
        role.permissions.clear();
        role.entitlements.clear();
    }

    function addPermissions(Role storage role, string[] calldata permissions) internal {
        uint256 permissionLen = permissions.length;
        for (uint256 i; i < permissionLen; ++i) {
            // if permission is empty, revert
            _checkEmptyString(permissions[i]);

            // if permission already exists, revert
            if (role.permissions.contains(permissions[i])) {
                IRolesBase.Roles__PermissionAlreadyExists.selector.revertWith();
            }

            role.permissions.add(permissions[i]);
        }
    }

    function removePermissions(Role storage role, string[] calldata permissions) internal {
        uint256 permissionLen = permissions.length;
        for (uint256 i; i < permissionLen; ++i) {
            // if permission is empty, revert
            _checkEmptyString(permissions[i]);

            if (!role.permissions.contains(permissions[i])) {
                IRolesBase.Roles__PermissionDoesNotExist.selector.revertWith();
            }

            role.permissions.remove(permissions[i]);
        }
    }

    function addEntitlement(Role storage role, address entitlement) internal {
        if (role.entitlements.contains(entitlement)) {
            IRolesBase.Roles__EntitlementAlreadyExists.selector.revertWith();
        }

        role.entitlements.add(entitlement);
    }

    function removeEntitlement(Role storage role, address entitlement) internal {
        if (!role.entitlements.contains(entitlement)) {
            IRolesBase.Roles__EntitlementDoesNotExist.selector.revertWith();
        }

        role.entitlements.remove(entitlement);
    }

    function getEntitlements(Role storage role) internal view returns (IEntitlement[] memory res) {
        address[] memory entitlementAddresses = role.entitlements.values();
        // directly cast the address array to IEntitlement array
        assembly ("memory-safe") {
            res := entitlementAddresses
        }
    }

    function _checkEmptyString(string calldata str) private pure {
        if (bytes(str).length == 0) IRolesBase.Roles__InvalidPermission.selector.revertWith();
    }
}
