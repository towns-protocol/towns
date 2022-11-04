//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {IEntitlementModule} from "./interfaces/IEntitlementModule.sol";
import {ZionRoleStorage} from "./storage/ZionRoleStorage.sol";
import {Errors} from "./libraries/Errors.sol";
import {DataTypes} from "./libraries/DataTypes.sol";
import {Events} from "./libraries/Events.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {ZionPermissionsRegistry} from "./ZionPermissionsRegistry.sol";
import {Constants} from "./libraries/Constants.sol";
import {PermissionTypes} from "./libraries/PermissionTypes.sol";
import {CreationLogic} from "./libraries/CreationLogic.sol";
import {Utils} from "./libraries/Utils.sol";
import {ISpaceManager} from "./interfaces/ISpaceManager.sol";

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

  function createRole(uint256 spaceId, string memory name)
    public
    onlySpaceManager
    returns (uint256)
  {
    return CreationLogic.createRole(spaceId, name, _rolesBySpaceId);
  }

  function createOwnerRole(uint256 spaceId)
    external
    onlySpaceManager
    returns (uint256)
  {
    uint256 ownerRoleId = createRole(spaceId, "Owner");

    DataTypes.Permission[] memory allPermissions = ZionPermissionsRegistry(
      PERMISSION_REGISTRY
    ).getAllPermissions();
    uint256 permissionLen = allPermissions.length;

    for (uint256 i = 0; i < permissionLen; ) {
      addPermissionToRole(spaceId, ownerRoleId, allPermissions[i]);
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
  ) public onlySpaceManager {
    _validateOwnerPermission(permission);

    CreationLogic.setPermission(
      spaceId,
      roleId,
      permission,
      _permissionsBySpaceIdByRoleId
    );
  }

  function removePermissionFromRole(
    uint256 spaceId,
    uint256 roleId,
    DataTypes.Permission memory permission
  ) public onlySpaceManager {
    _validateOwnerPermission(permission);

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

  function removeRole(uint256 spaceId, uint256 roleId)
    external
    onlySpaceManager
  {
    DataTypes.Role[] storage roles = _rolesBySpaceId[spaceId].roles;

    uint256 roleLen = roles.length;

    for (uint256 i = 0; i < roleLen; ) {
      if (roleId == roles[i].roleId) {
        DataTypes.Permission[]
          memory permissions = _permissionsBySpaceIdByRoleId[spaceId][roleId];

        uint256 permissionLen = permissions.length;

        for (uint256 j = 0; j < permissionLen; ) {
          removePermissionFromRole(spaceId, roleId, permissions[j]);
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

  function getPermissionsBySpaceIdByRoleId(uint256 spaceId, uint256 roleId)
    public
    view
    returns (DataTypes.Permission[] memory)
  {
    return _permissionsBySpaceIdByRoleId[spaceId][roleId];
  }

  function getRolesBySpaceId(uint256 spaceId)
    public
    view
    returns (DataTypes.Role[] memory)
  {
    return _rolesBySpaceId[spaceId].roles;
  }

  function getRoleBySpaceIdByRoleId(uint256 spaceId, uint256 roleId)
    public
    view
    returns (DataTypes.Role memory)
  {
    return _rolesBySpaceId[spaceId].roles[roleId];
  }

  function _validateOwnerPermission(DataTypes.Permission memory permission)
    internal
    view
  {
    if (
      keccak256(abi.encode(permission)) ==
      keccak256(
        abi.encode(
          ISpaceManager(SPACE_MANAGER).getPermissionFromMap(
            PermissionTypes.Owner
          )
        )
      )
    ) {
      revert Errors.InvalidParameters();
    }
  }
}
