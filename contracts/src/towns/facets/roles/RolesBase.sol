// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IRolesBase} from "./IRoles.sol";

// libraries
import {Validator} from "contracts/src/utils/Validator.sol";

// services
import {EntitlementsService} from "contracts/src/towns/facets/entitlements/EntitlementsService.sol";
import {ChannelService} from "contracts/src/towns/facets/channels/ChannelService.sol";
import {RolesService} from "./RolesService.sol";

// contracts

abstract contract RolesBase is IRolesBase {
  // =============================================================
  //                         Role Management
  // =============================================================
  function _createRole(
    string calldata roleName,
    string[] memory permissions,
    CreateEntitlement[] memory entitlements
  ) internal returns (uint256 roleId) {
    Validator.checkLength(roleName, 2);

    uint256 entitlementsLen = entitlements.length;

    address[] memory entitlementAddresses = new address[](entitlementsLen);

    for (uint256 i = 0; i < entitlementsLen; ) {
      EntitlementsService.validateEntitlement(entitlements[i].module);
      EntitlementsService.checkEntitlement(entitlements[i].module);
      entitlementAddresses[i] = entitlements[i].module;
      unchecked {
        i++;
      }
    }

    roleId = RolesService.addRole(
      roleName,
      false,
      permissions,
      entitlementAddresses
    );

    for (uint256 i = 0; i < entitlementsLen; ) {
      // check for empty address or data
      Validator.checkByteLength(entitlements[i].data);

      EntitlementsService.proxyAddRoleToEntitlement(
        entitlements[i].module,
        roleId,
        entitlements[i].data
      );
      unchecked {
        i++;
      }
    }

    RolesService.checkRoleExists(roleId);
    emit RoleCreated(msg.sender, roleId);
  }

  function _getRoles() internal view returns (Role[] memory roles) {
    uint256[] memory roleIds = RolesService.getRoleIds();
    uint256 roleIdLen = roleIds.length;

    roles = new Role[](roleIdLen);

    for (uint256 i = 0; i < roleIdLen; ) {
      (
        string memory name,
        bool isImmutable,
        string[] memory permissions,
        address[] memory entitlements
      ) = RolesService.getRole(roleIds[i]);

      roles[i] = Role({
        id: roleIds[i],
        name: name,
        disabled: isImmutable,
        permissions: permissions,
        entitlements: entitlements
      });

      unchecked {
        i++;
      }
    }
  }

  function _getRoleById(
    uint256 roleId
  ) internal view returns (Role memory role) {
    (
      string memory name,
      bool isImmutable,
      string[] memory permissions,
      address[] memory entitlements
    ) = RolesService.getRole(roleId);

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
    string[] memory permissions,
    CreateEntitlement[] memory entitlements
  ) internal {
    RolesService.checkRoleExists(roleId);

    // get current entitlements before updating them
    address[] memory currentEntitlements = RolesService.getEntitlementsByRole(
      roleId
    );
    uint256 currentEntitlementsLen = currentEntitlements.length;

    uint256 entitlementsLen = entitlements.length;
    address[] memory entitlementAddresses = new address[](entitlementsLen);

    for (uint256 i = 0; i < entitlementsLen; ) {
      EntitlementsService.validateEntitlement(entitlements[i].module);
      EntitlementsService.checkEntitlement(entitlements[i].module);
      entitlementAddresses[i] = entitlements[i].module;
      unchecked {
        i++;
      }
    }

    RolesService.updateRole(
      roleId,
      roleName,
      permissions,
      entitlementAddresses
    );

    if (entitlementsLen == 0) {
      return;
    }

    // loop through old entitlements and remove them
    for (uint256 i = 0; i < currentEntitlementsLen; ) {
      bytes[] memory entitlementData = EntitlementsService
        .proxyGetEntitlementDataByRole(currentEntitlements[i], roleId);
      uint256 entitlementDataLen = entitlementData.length;

      for (uint256 j = 0; j < entitlementDataLen; ) {
        EntitlementsService.proxyRemoveRoleFromEntitlement(
          currentEntitlements[i],
          roleId,
          entitlementData[j]
        );

        unchecked {
          j++;
        }
      }

      unchecked {
        i++;
      }
    }

    for (uint256 i = 0; i < entitlementsLen; ) {
      // check for empty address or data
      Validator.checkByteLength(entitlements[i].data);

      EntitlementsService.proxyAddRoleToEntitlement(
        entitlements[i].module,
        roleId,
        entitlements[i].data
      );

      unchecked {
        i++;
      }
    }

    emit RoleUpdated(msg.sender, roleId);
  }

  function _removeRole(uint256 roleId) internal {
    // get current entitlements
    address[] memory currentEntitlements = RolesService.getEntitlementsByRole(
      roleId
    );
    uint256 currentEntitlementsLen = currentEntitlements.length;

    RolesService.removeRole(roleId);

    string[] memory channelIds = ChannelService.getChannelIds();
    uint256 channelIdsLen = channelIds.length;

    // remove role from channels
    for (uint256 i = 0; i < channelIdsLen; ) {
      ChannelService.removeRoleFromChannel(channelIds[i], roleId);
      unchecked {
        i++;
      }
    }

    // remove role from entitlements
    for (uint256 i = 0; i < currentEntitlementsLen; ) {
      bytes[] memory entitlementData = EntitlementsService
        .proxyGetEntitlementDataByRole(currentEntitlements[i], roleId);
      uint256 entitlementDataLen = entitlementData.length;

      for (uint256 j = 0; j < entitlementDataLen; j++) {
        EntitlementsService.proxyRemoveRoleFromEntitlement(
          currentEntitlements[i],
          roleId,
          entitlementData[j]
        );
      }

      unchecked {
        i++;
      }
    }

    emit RoleRemoved(msg.sender, roleId);
  }

  // =============================================================
  //                    Permission Management
  // =============================================================
  function _addPermissionsToRole(
    uint256 roleId,
    string[] memory permissions
  ) internal {
    // check role exists
    RolesService.checkRole(roleId);

    // check permissions
    RolesService.addPermissionsToRole(roleId, permissions);
  }

  function _removePermissionsFromRole(
    uint256 roleId,
    string[] memory permissions
  ) internal {
    // check role exists
    RolesService.checkRole(roleId);

    // check permissions
    RolesService.removePermissionsFromRole(roleId, permissions);
  }

  function _getPermissionsByRoleId(
    uint256 roleId
  ) internal view returns (string[] memory permissions) {
    (, , permissions, ) = RolesService.getRole(roleId);
  }

  // =============================================================
  //                  Role - Entitlement Management
  // =============================================================

  function _addRoleToEntitlement(
    uint256 roleId,
    CreateEntitlement memory entitlement
  ) internal {
    // check role exists
    RolesService.checkRole(roleId);

    // check entitlements exists
    EntitlementsService.checkEntitlement(entitlement.module);

    // add entitlement to role
    RolesService.addEntitlementToRole(roleId, entitlement.module);

    // set entitlement to role
    EntitlementsService.proxyAddRoleToEntitlement(
      entitlement.module,
      roleId,
      entitlement.data
    );
  }

  function _removeRoleFromEntitlement(
    uint256 roleId,
    CreateEntitlement memory entitlement
  ) internal {
    // check role exists
    RolesService.checkRole(roleId);

    // check entitlements exists
    EntitlementsService.checkEntitlement(entitlement.module);

    // remove entitlement from role
    RolesService.removeEntitlementFromRole(roleId, entitlement.module);

    // set entitlement to role
    EntitlementsService.proxyRemoveRoleFromEntitlement(
      entitlement.module,
      roleId,
      entitlement.data
    );
  }
}
