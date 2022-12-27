//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {ISpaceManager} from "../../interfaces/ISpaceManager.sol";
import {IRoleManager} from "../../interfaces/IRoleManager.sol";

import {DataTypes} from "../../libraries/DataTypes.sol";
import {Constants} from "../../libraries/Constants.sol";
import {PermissionTypes} from "../../libraries/PermissionTypes.sol";
import {Errors} from "../../libraries/Errors.sol";

import {EntitlementModuleBase} from "../EntitlementModuleBase.sol";
import {Utils} from "../../libraries/Utils.sol";

contract UserGrantedEntitlementModule is EntitlementModuleBase {
  struct Entitlement {
    address grantedBy;
    uint256 grantedTime;
    uint256 roleId;
  }

  // spaceId => user => entitlement
  mapping(uint256 => mapping(address => Entitlement[]))
    internal _entitlementsByUserBySpaceId;

  // spaceId => roleId => user[]
  mapping(uint256 => mapping(uint256 => address[]))
    internal _usersByRoleIdBySpaceId;

  //spaceId => channelId => roleId[]
  mapping(uint256 => mapping(uint256 => uint256[]))
    internal _rolesByChannelIdBySpaceId;

  // spaceId => roleId => entitlementData[]
  mapping(uint256 => mapping(uint256 => bytes[]))
    internal _entitlementDataBySpaceIdByRoleId;

  constructor(
    string memory name_,
    string memory description_,
    string memory moduleType_,
    address spaceManager_,
    address roleManager_,
    address permissionRegistry_
  )
    EntitlementModuleBase(
      name_,
      description_,
      moduleType_,
      spaceManager_,
      roleManager_,
      permissionRegistry_
    )
  {}

  function getEntitlementDataByRoleId(
    uint256 spaceId,
    uint256 roleId
  ) external view override returns (bytes[] memory) {
    return _entitlementDataBySpaceIdByRoleId[spaceId][roleId];
  }

  function setSpaceEntitlement(
    uint256 spaceId,
    uint256 roleId,
    bytes calldata entitlementData
  ) external override onlySpaceManager {
    address user = abi.decode(entitlementData, (address));

    _usersByRoleIdBySpaceId[spaceId][roleId].push(user);
    _entitlementsByUserBySpaceId[spaceId][user].push(
      Entitlement(user, block.timestamp, roleId)
    );
    _entitlementDataBySpaceIdByRoleId[spaceId][roleId].push(entitlementData);
  }

  function addRoleIdToChannel(
    uint256 spaceId,
    uint256 channelId,
    uint256 roleId
  ) external override onlySpaceManager {
    // check for duplicate role ids
    uint256[] memory roles = _rolesByChannelIdBySpaceId[spaceId][channelId];

    for (uint256 i = 0; i < roles.length; i++) {
      if (roles[i] == roleId) {
        revert Errors.RoleAlreadyExists();
      }
    }

    //add the roleId to the mapping for the channel
    _rolesByChannelIdBySpaceId[spaceId][channelId].push(roleId);
  }

  function isEntitled(
    uint256 spaceId,
    uint256 channelId,
    address user,
    DataTypes.Permission memory permission
  ) public view override returns (bool) {
    //If we are checking for a channel
    if (channelId > 0) {
      //Get all the allowed roles for that channel
      uint256[] memory roleIdsForChannel = _rolesByChannelIdBySpaceId[spaceId][
        channelId
      ];

      //For each role, check if the user has that role
      for (uint256 i = 0; i < roleIdsForChannel.length; i++) {
        uint256 roleId = roleIdsForChannel[i];

        //Iterate through all the entitlements for that user and see if it matches the roleId,
        //if so, add it to the validEntitlementsForUserForChannel array

        //Get all the entitlements for that user
        Entitlement[] memory entitlementsForUser = _entitlementsByUserBySpaceId[
          spaceId
        ][user];

        //Plus the everyone entitlement
        Entitlement[]
          memory everyoneEntitlements = _entitlementsByUserBySpaceId[spaceId][
            Constants.EVERYONE_ADDRESS
          ];

        //Combine them both for all valid entitlements we want to check against
        Entitlement[] memory validEntitlementsForUserForChannel = concatArrays(
          everyoneEntitlements,
          entitlementsForUser
        );

        if (validEntitlementsForUserForChannel.length > 0) {
          for (
            uint256 j = 0;
            j < validEntitlementsForUserForChannel.length;
            j++
          ) {
            //If the roleId matches, check if that role has the permission we are looking for
            if (validEntitlementsForUserForChannel[j].roleId == roleId) {
              if (
                _checkEntitlementHasPermission(
                  spaceId,
                  validEntitlementsForUserForChannel[j],
                  permission
                )
              ) {
                return true;
              }
            }
          }
        }
      }
    } else {
      //Get everyone entitlement for the space
      Entitlement[] memory everyoneEntitlements = _entitlementsByUserBySpaceId[
        spaceId
      ][Constants.EVERYONE_ADDRESS];

      //Get all the entitlements for this specific user
      Entitlement[] memory userEntitlements = _entitlementsByUserBySpaceId[
        spaceId
      ][user];

      //Combine them both for all valid entitlements we want to check against
      Entitlement[] memory validEntitlementsForUserForSpace = concatArrays(
        everyoneEntitlements,
        userEntitlements
      );

      //Check if any of the entitlements' roles have the permission we are checking for
      for (uint256 i = 0; i < validEntitlementsForUserForSpace.length; i++) {
        if (
          _checkEntitlementHasPermission(
            spaceId,
            validEntitlementsForUserForSpace[i],
            permission
          )
        ) {
          return true;
        }
      }
    }
    return false;
  }

  /// Check if any of the entitlements contain the permission we are checking for
  function _checkEntitlementHasPermission(
    uint256 spaceId,
    Entitlement memory entitlement,
    DataTypes.Permission memory permission
  ) internal view returns (bool) {
    uint256 roleId = entitlement.roleId;

    DataTypes.Permission[] memory permissions = IRoleManager(_roleManager)
      .getPermissionsBySpaceIdByRoleId(spaceId, roleId);
    for (uint256 p = 0; p < permissions.length; p++) {
      if (
        keccak256(abi.encodePacked(permissions[p].name)) ==
        keccak256(abi.encodePacked(permission.name))
      ) {
        return true;
      }
    }

    return false;
  }

  function removeSpaceEntitlement(
    uint256 spaceId,
    uint256 roleId,
    bytes calldata entitlementData
  ) external override onlySpaceManager {
    address user = abi.decode(entitlementData, (address));

    uint256 entitlementLen = _entitlementsByUserBySpaceId[spaceId][user].length;
    //Iterate through all the entitlements for that user and see if it matches the roleId,
    //if so
    for (uint256 j = 0; j < entitlementLen; j++) {
      if (_entitlementsByUserBySpaceId[spaceId][user][j].roleId == roleId) {
        _entitlementsByUserBySpaceId[spaceId][user][
          j
        ] = _entitlementsByUserBySpaceId[spaceId][user][entitlementLen - 1];

        _entitlementsByUserBySpaceId[spaceId][user].pop();
      }
    }

    uint256 usersLen = _usersByRoleIdBySpaceId[spaceId][roleId].length;

    for (uint256 k = 0; k < usersLen; k++) {
      if (_usersByRoleIdBySpaceId[spaceId][roleId][k] == user) {
        _usersByRoleIdBySpaceId[spaceId][roleId][k] = _usersByRoleIdBySpaceId[
          spaceId
        ][roleId][usersLen - 1];

        _usersByRoleIdBySpaceId[spaceId][roleId].pop();
      }
    }

    uint256 entitlementDataLen = _entitlementDataBySpaceIdByRoleId[spaceId][roleId].length;
    for (uint256 i = 0; i < entitlementDataLen; i++) {
      if (Utils.bytesEquals(_entitlementDataBySpaceIdByRoleId[spaceId][roleId][i], entitlementData)) {
        _entitlementDataBySpaceIdByRoleId[spaceId][roleId][
          i
        ] = _entitlementDataBySpaceIdByRoleId[spaceId][roleId][entitlementDataLen - 1];
        _entitlementDataBySpaceIdByRoleId[spaceId][roleId].pop();
        break;
      }
    }
    if (_entitlementDataBySpaceIdByRoleId[spaceId][roleId].length == 0) {
      delete _entitlementDataBySpaceIdByRoleId[spaceId][roleId];
    }
  }

  function removeRoleIdFromChannel(
    uint256 spaceId,
    uint256 channelId,
    uint256 roleId
  ) external override onlySpaceManager {
    //Look through all the roles assigned to that channel, if it matches the role
    //we are removing, remove it
    uint256 roleLen = _rolesByChannelIdBySpaceId[spaceId][channelId].length;
    for (uint256 i = 0; i < roleLen; i++) {
      if (_rolesByChannelIdBySpaceId[spaceId][channelId][i] == roleId) {
        _rolesByChannelIdBySpaceId[spaceId][channelId][
          i
        ] = _rolesByChannelIdBySpaceId[spaceId][channelId][roleLen - 1];
        _rolesByChannelIdBySpaceId[spaceId][channelId].pop();
      }
    }
  }

  function getUserRoles(
    uint256 spaceId,
    address user
  ) external view override returns (DataTypes.Role[] memory) {
    IRoleManager roleManager = IRoleManager(_roleManager);

    // Create an array the size of the total possible roles for this user
    DataTypes.Role[] memory roles = new DataTypes.Role[](
      _entitlementsByUserBySpaceId[spaceId][user].length
    );

    Entitlement[] memory userEntitlements = _entitlementsByUserBySpaceId[
      spaceId
    ][user];

    for (uint256 i = 0; i < userEntitlements.length; i++) {
      roles[i] = roleManager.getRoleBySpaceIdByRoleId(
        spaceId,
        userEntitlements[i].roleId
      );
    }

    return roles;
  }

  function concatArrays(
    Entitlement[] memory a,
    Entitlement[] memory b
  ) internal pure returns (Entitlement[] memory) {
    Entitlement[] memory c = new Entitlement[](a.length + b.length);
    uint256 i = 0;
    for (; i < a.length; i++) {
      c[i] = a[i];
    }
    uint256 j = 0;
    while (j < b.length) {
      c[i++] = b[j++];
    }
    return c;
  }
}
