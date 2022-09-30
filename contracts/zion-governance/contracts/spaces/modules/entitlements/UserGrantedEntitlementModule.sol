//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {ISpaceManager} from "../../interfaces/ISpaceManager.sol";
import {ZionSpaceManager} from "../../ZionSpaceManager.sol";
import {DataTypes} from "../../libraries/DataTypes.sol";
import {EntitlementModuleBase} from "../EntitlementModuleBase.sol";
import {PermissionTypes} from "../../libraries/PermissionTypes.sol";

contract UserGrantedEntitlementModule is EntitlementModuleBase {
  struct Entitlement {
    address grantedBy;
    uint256 grantedTime;
    uint256 roleId;
  }

  mapping(uint256 => mapping(address => Entitlement[])) _entitlementsBySpaceIdbyUser;
  mapping(uint256 => mapping(uint256 => mapping(address => Entitlement[]))) _entitlementsBySpaceIdByRoomIdByUser;

  constructor(
    string memory name_,
    string memory description_,
    address spaceManager_
  ) EntitlementModuleBase(name_, description_, spaceManager_) {}

  function setEntitlement(
    uint256 spaceId,
    uint256 roomId,
    uint256 roleId,
    bytes calldata entitlementData
  ) external override onlySpaceManager {
    require(
      _isPermittedToSetEntitlement(spaceId, msg.sender, roleId),
      "Only the owner can update the entitlements"
    );

    address user = abi.decode(entitlementData, (address));

    if (roomId > 0) {
      _entitlementsBySpaceIdByRoomIdByUser[spaceId][roomId][user].push(
        Entitlement(user, block.timestamp, roleId)
      );
    } else {
      _entitlementsBySpaceIdbyUser[spaceId][user].push(
        Entitlement(user, block.timestamp, roleId)
      );
    }
  }

  /// @notice Checks if a user has access to add a new entitlement by checking if the user is the owner of the space or is entitled to
  ///         grant permissions or is transitively allowed to grant this role or is the zion space manager
  /// @param spaceId The id of the space
  function _isPermittedToSetEntitlement(
    uint256 spaceId,
    address caller,
    uint256
  ) internal view returns (bool) {
    ISpaceManager spaceManager = ISpaceManager(_spaceManager);
    DataTypes.Permission memory grantPermission = spaceManager
      .getPermissionFromMap(PermissionTypes.ModifyPermissions);

    if (
      caller == _spaceManager ||
      spaceManager.getSpaceOwnerBySpaceId(spaceId) == caller ||
      spaceManager.isEntitled(spaceId, 0, caller, grantPermission)
    ) {
      return true;
    }
    return false;
  }

  function isEntitled(
    uint256 spaceId,
    uint256 roomId,
    address user,
    DataTypes.Permission memory permission
  ) public view override returns (bool) {
    ISpaceManager spaceManager = ISpaceManager(_spaceManager);

    if (roomId > 0) {
      Entitlement[] memory entitlements = _entitlementsBySpaceIdByRoomIdByUser[
        spaceId
      ][roomId][user];

      for (uint256 i = 0; i < entitlements.length; i++) {
        uint256 roleId = entitlements[i].roleId;

        DataTypes.Permission[] memory permissions = spaceManager
          .getPermissionsBySpaceIdByRoleId(spaceId, roleId);

        for (uint256 j = 0; j < permissions.length; j++) {
          if (
            keccak256(abi.encodePacked(permissions[j].name)) ==
            keccak256(abi.encodePacked(permission.name))
          ) {
            return true;
          }
        }
      }
    } else {
      Entitlement[] memory entitlements = _entitlementsBySpaceIdbyUser[spaceId][
        user
      ];

      for (uint256 i = 0; i < entitlements.length; i++) {
        uint256 roleId = entitlements[i].roleId;

        DataTypes.Permission[] memory permissions = spaceManager
          .getPermissionsBySpaceIdByRoleId(spaceId, roleId);

        for (uint256 j = 0; j < permissions.length; j++) {
          if (
            keccak256(abi.encodePacked(permissions[j].name)) ==
            keccak256(abi.encodePacked(permission.name))
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  function isTransitivelyEntitled(
    uint256 spaceId,
    uint256 roomId,
    address user,
    uint256 roleId
  ) public view override returns (bool) {
    DataTypes.Role[] memory roles = getUserRoles(spaceId, roomId, user);
    for (uint256 i = 0; i < roles.length; i++) {
      if (roles[i].roleId == roleId && roles[i].isTransitive == true) {
        return true;
      }
    }
    return false;
  }

  function removeEntitlement(
    uint256 spaceId,
    uint256 roomId,
    uint256[] calldata _roleIds,
    bytes calldata entitlementData
  ) external override onlySpaceManager {
    require(
      _isGranted(spaceId, msg.sender),
      "Only the owner can update the entitlements"
    );

    address user = abi.decode(entitlementData, (address));

    for (uint256 i = 0; i < _roleIds.length; i++) {
      if (roomId > 0) {
        uint256 entitlementLen = _entitlementsBySpaceIdByRoomIdByUser[spaceId][
          roomId
        ][user].length;

        for (uint256 j = 0; j < entitlementLen; j++) {
          if (
            _entitlementsBySpaceIdByRoomIdByUser[spaceId][roomId][user][j]
              .roleId == _roleIds[i]
          ) {
            delete _entitlementsBySpaceIdByRoomIdByUser[spaceId][roomId][user][
              j
            ];
          }
        }
      } else {
        uint256 entitlementLen = _entitlementsBySpaceIdbyUser[spaceId][user]
          .length;

        for (uint256 j = 0; j < entitlementLen; j++) {
          if (
            _entitlementsBySpaceIdbyUser[spaceId][user][j].roleId == _roleIds[i]
          ) {
            delete _entitlementsBySpaceIdbyUser[spaceId][user][j];
          }
        }
      }
    }
  }

  function getUserRoles(
    uint256 spaceId,
    uint256 roomId,
    address user
  ) public view returns (DataTypes.Role[] memory) {
    ISpaceManager spaceManager = ISpaceManager(_spaceManager);

    // Create an array the size of the total possible roles for this user
    DataTypes.Role[] memory roles = new DataTypes.Role[](
      _entitlementsBySpaceIdbyUser[spaceId][user].length +
        _entitlementsBySpaceIdByRoomIdByUser[spaceId][roomId][user].length
    );

    if (roomId > 0) {
      // Get all the entitlements for this user
      Entitlement[] memory entitlements = _entitlementsBySpaceIdByRoomIdByUser[
        spaceId
      ][roomId][user];

      //Iterate through each of them and get the Role out and add it to the array
      for (uint256 i = 0; i < entitlements.length; i++) {
        roles[i] = spaceManager.getRoleBySpaceIdByRoleId(
          spaceId,
          entitlements[i].roleId
        );
      }
    } else {
      Entitlement[] memory userEntitlements = _entitlementsBySpaceIdbyUser[
        spaceId
      ][user];

      for (uint256 i = 0; i < userEntitlements.length; i++) {
        roles[i] = spaceManager.getRoleBySpaceIdByRoleId(
          spaceId,
          userEntitlements[i].roleId
        );
      }
    }
    return roles;
  }

  function _isGranted(uint256 spaceId, address addr)
    internal
    view
    returns (bool)
  {
    return
      addr == _spaceManager ||
      ISpaceManager(_spaceManager).getSpaceOwnerBySpaceId(spaceId) == addr;
  }
}
