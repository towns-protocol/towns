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

  mapping(uint256 => mapping(address => Entitlement[]))
    internal _entitlementsBySpaceIdbyUser;
  mapping(uint256 => mapping(uint256 => mapping(address => Entitlement[])))
    internal _entitlementsBySpaceIdByRoomIdByUser;

  constructor(
    string memory name_,
    string memory description_,
    address spaceManager_
  ) EntitlementModuleBase(name_, description_, spaceManager_) {}

  function setEntitlement(
    string memory spaceId,
    string memory channelId,
    uint256 roleId,
    bytes calldata entitlementData
  ) external override onlyAllowed(spaceId, channelId, msg.sender) {
    uint256 _spaceId = ISpaceManager(_spaceManager).getSpaceIdByNetworkId(
      spaceId
    );
    uint256 _channelId = ISpaceManager(_spaceManager).getChannelIdByNetworkId(
      spaceId,
      channelId
    );
    address user = abi.decode(entitlementData, (address));
    if (bytes(channelId).length > 0) {
      _entitlementsBySpaceIdByRoomIdByUser[_spaceId][_channelId][user].push(
        Entitlement(user, block.timestamp, roleId)
      );
    } else {
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
      Entitlement[] memory entitlements = _entitlementsBySpaceIdByRoomIdByUser[
        _spaceId
      ][_channelId][user];

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
      Entitlement[] memory entitlements = _entitlementsBySpaceIdbyUser[
        _spaceId
      ][user];

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

  function removeEntitlement(
    string calldata spaceId,
    string calldata channelId,
    uint256[] calldata _roleIds,
    bytes calldata entitlementData
  ) external override onlyAllowed(spaceId, channelId, msg.sender) {
    // ISpaceManager spaceManager = ISpaceManager(_spaceManager);
    // uint256 _spaceId = spaceManager.getSpaceIdByNetworkId(spaceId);
    // uint256 _roomId = spaceManager.getChannelIdByNetworkId(spaceId, channelId);
    // address user = abi.decode(entitlementData, (address));
    // for (uint256 i = 0; i < _roleIds.length; i++) {
    //   if (bytes(channelId).length > 0) {
    //     uint256 entitlementLen = _entitlementsBySpaceIdByRoomIdByUser[_spaceId][
    //       _roomId
    //     ][user].length;
    //     for (uint256 j = 0; j < entitlementLen; j++) {
    //       if (
    //         _entitlementsBySpaceIdByRoomIdByUser[_spaceId][_roomId][user][j]
    //           .roleId == _roleIds[i]
    //       ) {
    //         delete _entitlementsBySpaceIdByRoomIdByUser[_spaceId][_roomId][
    //           user
    //         ][j];
    //       }
    //     }
    //   } else {
    //     uint256 entitlementLen = _entitlementsBySpaceIdbyUser[_spaceId][user]
    //       .length;
    //     for (uint256 j = 0; j < entitlementLen; j++) {
    //       if (
    //         _entitlementsBySpaceIdbyUser[_spaceId][user][j].roleId ==
    //         _roleIds[i]
    //       ) {
    //         delete _entitlementsBySpaceIdbyUser[_spaceId][user][j];
    //       }
    //     }
    //   }
    // }
  }

  function getUserRoles(
    string calldata spaceId,
    string calldata channelId,
    address user
  ) public view returns (DataTypes.Role[] memory) {
    ISpaceManager spaceManager = ISpaceManager(_spaceManager);

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
        roles[i] = spaceManager.getRoleBySpaceIdByRoleId(
          spaceId,
          entitlements[i].roleId
        );
      }
    } else {
      Entitlement[] memory userEntitlements = _entitlementsBySpaceIdbyUser[
        _spaceId
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
}
