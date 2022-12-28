//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {IEntitlementModule} from "./interfaces/IEntitlementModule.sol";
import {ZionRoleStorage} from "./storage/ZionRoleStorage.sol";
import {Errors} from "./libraries/Errors.sol";
import {DataTypes} from "./libraries/DataTypes.sol";
import {Events} from "./libraries/Events.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {Constants} from "./libraries/Constants.sol";
import {PermissionTypes} from "./libraries/PermissionTypes.sol";
import {CreationLogic} from "./libraries/CreationLogic.sol";
import {Utils} from "./libraries/Utils.sol";
import {ISpaceManager} from "./interfaces/ISpaceManager.sol";
import {IPermissionRegistry} from "./interfaces/IPermissionRegistry.sol";

contract ZionRoleManager is Ownable, ZionRoleStorage {
  address internal immutable PERMISSION_REGISTRY;
  address internal SPACE_MANAGER;

  modifier onlySpaceManager() {
    if (msg.sender != SPACE_MANAGER) revert Errors.NotSpaceManager();
    _;
  }

  constructor(address permissionRegistry) {
    if (permissionRegistry == address(0)) revert Errors.InvalidParameters();
    PERMISSION_REGISTRY = permissionRegistry;
  }

  function setSpaceManager(address spaceManager) external onlyOwner {
    SPACE_MANAGER = spaceManager;
  }

  function createRole(
    uint256 spaceId,
    string memory name
  ) external onlySpaceManager returns (uint256) {
    return CreationLogic.createRole(spaceId, name, _rolesBySpaceId);
  }

  function createRole(
    uint256 spaceId,
    string memory name,
    DataTypes.Permission[] calldata permissions
  ) external onlySpaceManager returns (uint256) {
    uint256 roleId = CreationLogic.createRole(spaceId, name, _rolesBySpaceId);
    for (uint256 i = 0; i < permissions.length; i++) {
      _addPermissionToRole(spaceId, roleId, permissions[i]);
    }
    return roleId;
  }

  function createOwnerRole(
    uint256 spaceId
  ) external onlySpaceManager returns (uint256) {
    uint256 ownerRoleId = CreationLogic.createRole(
      spaceId,
      Constants.OWNER_ROLE_NAME,
      _rolesBySpaceId
    );

    DataTypes.Permission[] memory allPermissions = IPermissionRegistry(
      PERMISSION_REGISTRY
    ).getAllPermissions();
    uint256 permissionLen = allPermissions.length;

    for (uint256 i = 0; i < permissionLen; ) {
      _addPermissionToRole(spaceId, ownerRoleId, allPermissions[i]);
      unchecked {
        ++i;
      }
    }

    return ownerRoleId;
  }

  function addPermissionToRole(
    uint256 spaceId,
    uint256 roleId,
    DataTypes.Permission memory permission
  ) external onlySpaceManager {
    _validateNotModifyOwner(permission);
    _addPermissionToRole(spaceId, roleId, permission);
  }

  function removePermissionFromRole(
    uint256 spaceId,
    uint256 roleId,
    DataTypes.Permission memory permission
  ) external onlySpaceManager {
    _validateNotModifyOwner(permission);
    _removePermissionFromRole(spaceId, roleId, permission);
  }

  function modifyRoleName(
    uint256 spaceId,
    uint256 roleId,
    string calldata newRoleName
  ) external onlySpaceManager {
    // Owner role name cannot be modified
    if (Utils.stringEquals(newRoleName, Constants.OWNER_ROLE_NAME)) {
      revert Errors.InvalidParameters();
    }

    DataTypes.Role[] memory roles = _rolesBySpaceId[spaceId].roles;
    uint256 roleLen = roles.length;
    for (uint256 i = 0; i < roleLen; ) {
      if (roleId == roles[i].roleId) {
        if (!Utils.stringEquals(roles[i].name, newRoleName)) {
          _rolesBySpaceId[spaceId].roles[i].name = newRoleName;
        }
        break;
      }
      unchecked {
        ++i;
      }
    }
  }

  function removeRole(
    uint256 spaceId,
    uint256 roleId
  ) external onlySpaceManager {
    DataTypes.Role[] storage roles = _rolesBySpaceId[spaceId].roles;

    uint256 roleLen = roles.length;

    for (uint256 i = 0; i < roleLen; ) {
      if (roleId == roles[i].roleId) {
        DataTypes.Permission[]
          memory permissions = _permissionsBySpaceIdByRoleId[spaceId][roleId];

        uint256 permissionLen = permissions.length;

        for (uint256 j = 0; j < permissionLen; ) {
          _removePermissionFromRole(spaceId, roleId, permissions[j]);
          unchecked {
            ++j;
          }
        }

        roles[i] = roles[roleLen - 1];
        roles.pop();
        break;
      }

      unchecked {
        ++i;
      }
    }
  }

  function getPermissionsBySpaceIdByRoleId(
    uint256 spaceId,
    uint256 roleId
  ) external view returns (DataTypes.Permission[] memory) {
    return _permissionsBySpaceIdByRoleId[spaceId][roleId];
  }

  function getRolesBySpaceId(
    uint256 spaceId
  ) external view returns (DataTypes.Role[] memory) {
    return _rolesBySpaceId[spaceId].roles;
  }

  function getRoleBySpaceIdByRoleId(
    uint256 spaceId,
    uint256 roleId
  ) external view returns (DataTypes.Role memory role) {
    DataTypes.Role[] memory roles = _rolesBySpaceId[spaceId].roles;
    uint256 roleLen = roles.length;

    for (uint256 i = 0; i < roleLen; ) {
      if (roleId == roles[i].roleId) {
        return roles[i];
      }

      unchecked {
        ++i;
      }
    }
  }

  function _addPermissionToRole(
    uint256 spaceId,
    uint256 roleId,
    DataTypes.Permission memory permission
  ) internal {
    CreationLogic.setPermission(
      spaceId,
      roleId,
      permission,
      _permissionsBySpaceIdByRoleId
    );
  }

  function _removePermissionFromRole(
    uint256 spaceId,
    uint256 roleId,
    DataTypes.Permission memory permission
  ) internal {
    DataTypes.Permission[] storage permissions = _permissionsBySpaceIdByRoleId[
      spaceId
    ][roleId];

    uint256 permissionLen = permissions.length;

    for (uint256 i = 0; i < permissionLen; ) {
      if (Utils.stringEquals(permission.name, permissions[i].name)) {
        permissions[i] = permissions[permissionLen - 1];
        permissions.pop();
        break;
      }

      unchecked {
        ++i;
      }
    }
  }

  function _validateNotModifyOwner(
    DataTypes.Permission memory permission
  ) internal view {
    if (
      keccak256(abi.encode(permission)) ==
      keccak256(
        abi.encode(
          IPermissionRegistry(PERMISSION_REGISTRY)
            .getPermissionByPermissionType(PermissionTypes.Owner)
        )
      )
    ) {
      revert Errors.InvalidParameters();
    }
  }
}
