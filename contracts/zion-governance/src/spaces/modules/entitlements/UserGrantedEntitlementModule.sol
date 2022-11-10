//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {ISpaceManager} from "../../interfaces/ISpaceManager.sol";
import {IRoleManager} from "../../interfaces/IRoleManager.sol";
import {IPermissionRegistry} from "../../interfaces/IPermissionRegistry.sol";

import {DataTypes} from "../../libraries/DataTypes.sol";
import {Constants} from "../../libraries/Constants.sol";
import {PermissionTypes} from "../../libraries/PermissionTypes.sol";
import {Errors} from "../../libraries/Errors.sol";

import {EntitlementModuleBase} from "../EntitlementModuleBase.sol";

contract UserGrantedEntitlementModule is EntitlementModuleBase {
  struct Entitlement {
    address grantedBy;
    uint256 grantedTime;
    uint256 roleId;
  }

  // spaceId => user => entitlement
  mapping(uint256 => mapping(address => Entitlement[]))
    internal _entitlementsBySpaceIdbyUser;

  // spaceId => channel => user => entitlement
  mapping(uint256 => mapping(uint256 => mapping(address => Entitlement[])))
    internal _entitlementsBySpaceIdByRoomIdByUser;

  // spaceId => roleId => user[]
  mapping(uint256 => mapping(uint256 => address[]))
    internal _entitlementDataBySpaceIdByUser;

  // spaceId => channelId => roleId => user[]
  mapping(uint256 => mapping(uint256 => mapping(uint256 => address[])))
    internal _entitlementDataBySpaceIdByRoomIdByUser;

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

  function getEntitlementData(
    string calldata spaceId,
    string calldata channelId,
    uint256 roleId
  ) external view returns (address[] memory) {
    if (
      !isEntitled(
        spaceId,
        channelId,
        msg.sender,
        IPermissionRegistry(_permisionRegistry).getPermissionByPermissionType(
          PermissionTypes.Read
        )
      )
    ) {
      revert Errors.NotAllowed();
    }

    uint256 _spaceId = ISpaceManager(_spaceManager).getSpaceIdByNetworkId(
      spaceId
    );

    if (bytes(channelId).length == 0) {
      return _entitlementDataBySpaceIdByUser[_spaceId][roleId];
    } else {
      uint256 _channelId = ISpaceManager(_spaceManager).getChannelIdByNetworkId(
        spaceId,
        channelId
      );
      return
        _entitlementDataBySpaceIdByRoomIdByUser[_spaceId][_channelId][roleId];
    }
  }

  function setEntitlement(
    string memory spaceId,
    string memory channelId,
    uint256 roleId,
    bytes calldata entitlementData
  ) external override onlySpaceManager {
    uint256 _spaceId = ISpaceManager(_spaceManager).getSpaceIdByNetworkId(
      spaceId
    );
    uint256 _channelId = ISpaceManager(_spaceManager).getChannelIdByNetworkId(
      spaceId,
      channelId
    );
    address user = abi.decode(entitlementData, (address));

    if (bytes(channelId).length > 0) {
      _entitlementDataBySpaceIdByRoomIdByUser[_spaceId][_channelId][roleId]
        .push(user);
      _entitlementsBySpaceIdByRoomIdByUser[_spaceId][_channelId][user].push(
        Entitlement(user, block.timestamp, roleId)
      );
    } else {
      _entitlementDataBySpaceIdByUser[_spaceId][roleId].push(user);
      _entitlementsBySpaceIdbyUser[_spaceId][user].push(
        Entitlement(user, block.timestamp, roleId)
      );
    }
  }

  function isEntitled(
    string calldata spaceId,
    string calldata channelId,
    address user,
    DataTypes.Permission memory permission
  ) public view override returns (bool) {
    ISpaceManager spaceManager = ISpaceManager(_spaceManager);

    uint256 _spaceId = spaceManager.getSpaceIdByNetworkId(spaceId);
    uint256 _channelId = spaceManager.getChannelIdByNetworkId(
      spaceId,
      channelId
    );

    if (_channelId > 0) {
      Entitlement[]
        memory everyoneEntitlements = _entitlementsBySpaceIdByRoomIdByUser[
          _spaceId
        ][_channelId][Constants.EVERYONE_ADDRESS];

      Entitlement[]
        memory userEntitlements = _entitlementsBySpaceIdByRoomIdByUser[
          _spaceId
        ][_channelId][user];

      Entitlement[] memory allEntitlements = concatArrays(
        everyoneEntitlements,
        userEntitlements
      );

      return
        _checkEntitlementsHavePermission(_spaceId, allEntitlements, permission);
    } else {
      Entitlement[] memory everyoneEntitlements = _entitlementsBySpaceIdbyUser[
        _spaceId
      ][Constants.EVERYONE_ADDRESS];

      Entitlement[] memory userEntitlements = _entitlementsBySpaceIdbyUser[
        _spaceId
      ][user];

      Entitlement[] memory allEntitlements = concatArrays(
        everyoneEntitlements,
        userEntitlements
      );

      return
        _checkEntitlementsHavePermission(_spaceId, allEntitlements, permission);
    }
  }

  function _checkEntitlementsHavePermission(
    uint256 spaceId,
    Entitlement[] memory allEntitlements,
    DataTypes.Permission memory permission
  ) internal view returns (bool) {
    for (uint256 k = 0; k < allEntitlements.length; k++) {
      uint256 roleId = allEntitlements[k].roleId;

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
    }
    return false;
  }

  function removeEntitlement(
    string calldata spaceId,
    string calldata channelId,
    uint256 roleId,
    bytes calldata entitlementData
  ) external override onlySpaceManager {
    ISpaceManager spaceManager = ISpaceManager(_spaceManager);
    uint256 _spaceId = spaceManager.getSpaceIdByNetworkId(spaceId);
    uint256 _channelId = spaceManager.getChannelIdByNetworkId(
      spaceId,
      channelId
    );
    address user = abi.decode(entitlementData, (address));

    if (_channelId > 0) {
      uint256 entitlementLen = _entitlementsBySpaceIdByRoomIdByUser[_spaceId][
        _channelId
      ][user].length;
      uint256 entitlementDataLen = _entitlementDataBySpaceIdByRoomIdByUser[
        _spaceId
      ][_channelId][roleId].length;

      for (uint256 i = 0; i < entitlementLen; i++) {
        if (
          _entitlementsBySpaceIdByRoomIdByUser[_spaceId][_channelId][user][i]
            .roleId == roleId
        ) {
          _entitlementsBySpaceIdByRoomIdByUser[_spaceId][_channelId][user][
            i
          ] = _entitlementsBySpaceIdByRoomIdByUser[_spaceId][_channelId][user][
            entitlementLen - 1
          ];
          break;
        }
      }

      for (uint i = 0; i < entitlementDataLen; i++) {
        if (
          _entitlementDataBySpaceIdByRoomIdByUser[_spaceId][_channelId][roleId][
            i
          ] == user
        ) {
          _entitlementDataBySpaceIdByRoomIdByUser[_spaceId][_channelId][roleId][
            i
          ] = _entitlementDataBySpaceIdByRoomIdByUser[_spaceId][_channelId][
            roleId
          ][entitlementDataLen - 1];
          break;
        }
      }

      _entitlementDataBySpaceIdByRoomIdByUser[_spaceId][_channelId][roleId]
        .pop();
      _entitlementsBySpaceIdByRoomIdByUser[_spaceId][_channelId][user].pop();
    } else {
      uint256 entitlementLen = _entitlementsBySpaceIdbyUser[_spaceId][user]
        .length;
      uint256 entitlementDataLen = _entitlementDataBySpaceIdByUser[_spaceId][
        roleId
      ].length;

      for (uint256 j = 0; j < entitlementLen; j++) {
        if (_entitlementsBySpaceIdbyUser[_spaceId][user][j].roleId == roleId) {
          _entitlementsBySpaceIdbyUser[_spaceId][user][
            j
          ] = _entitlementsBySpaceIdbyUser[_spaceId][user][entitlementLen - 1];
          break;
        }
      }

      for (uint256 k = 0; k < entitlementDataLen; k++) {
        if (_entitlementDataBySpaceIdByUser[_spaceId][roleId][k] == user) {
          _entitlementDataBySpaceIdByUser[_spaceId][roleId][
            k
          ] = _entitlementDataBySpaceIdByUser[_spaceId][roleId][
            entitlementDataLen - 1
          ];
          break;
        }
      }

      _entitlementDataBySpaceIdByUser[_spaceId][roleId].pop();
      _entitlementsBySpaceIdbyUser[_spaceId][user].pop();
    }
  }

  function getUserRoles(
    string calldata spaceId,
    string calldata channelId,
    address user
  ) public view returns (DataTypes.Role[] memory) {
    ISpaceManager spaceManager = ISpaceManager(_spaceManager);
    IRoleManager roleManager = IRoleManager(_roleManager);

    uint256 _spaceId = spaceManager.getSpaceIdByNetworkId(spaceId);
    uint256 _channelId = spaceManager.getChannelIdByNetworkId(
      spaceId,
      channelId
    );

    // Create an array the size of the total possible roles for this user
    DataTypes.Role[] memory roles = new DataTypes.Role[](
      _entitlementsBySpaceIdbyUser[_spaceId][user].length +
        _entitlementsBySpaceIdByRoomIdByUser[_spaceId][_channelId][user].length
    );

    if (bytes(channelId).length > 0) {
      // Get all the entitlements for this user
      Entitlement[] memory entitlements = _entitlementsBySpaceIdByRoomIdByUser[
        _spaceId
      ][_channelId][user];

      //Iterate through each of them and get the Role out and add it to the array
      for (uint256 i = 0; i < entitlements.length; i++) {
        roles[i] = roleManager.getRoleBySpaceIdByRoleId(
          _spaceId,
          entitlements[i].roleId
        );
      }
    } else {
      Entitlement[] memory userEntitlements = _entitlementsBySpaceIdbyUser[
        _spaceId
      ][user];

      for (uint256 i = 0; i < userEntitlements.length; i++) {
        roles[i] = roleManager.getRoleBySpaceIdByRoleId(
          _spaceId,
          userEntitlements[i].roleId
        );
      }
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
