//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {ISpaceManager} from "../../interfaces/ISpaceManager.sol";
import {DataTypes} from "../../libraries/DataTypes.sol";
import {EntitlementModuleBase} from "../EntitlementModuleBase.sol";

contract UserGrantedEntitlementModule is EntitlementModuleBase {
  struct Entitlement {
    address grantedBy;
    uint256 grantedTime;
    DataTypes.EntitlementType entitlementType;
  }

  struct SpaceUserEntitlements {
    mapping(address => Entitlement[]) byUser;
    mapping(uint256 => mapping(address => Entitlement[])) byUserByRoomId;
  }

  mapping(uint256 => SpaceUserEntitlements) internal _entitlementsBySpaceId;

  constructor(
    string memory name_,
    string memory description_,
    address spaceManager_
  ) EntitlementModuleBase(name_, description_, spaceManager_) {}

  function setEntitlement(
    uint256 spaceId,
    uint256 roomId,
    DataTypes.EntitlementType[] calldata entitlementTypes,
    bytes calldata entitlementData
  ) external override onlySpaceManager {
    require(
      _isGranted(spaceId, msg.sender),
      "Only the owner can update the entitlements"
    );

    address user = abi.decode(entitlementData, (address));

    for (uint256 i = 0; i < entitlementTypes.length; i++) {
      if (roomId > 0) {
        _entitlementsBySpaceId[spaceId].byUserByRoomId[roomId][user].push(
          Entitlement(user, block.timestamp, entitlementTypes[i])
        );
      } else {
        _entitlementsBySpaceId[spaceId].byUser[user].push(
          Entitlement(user, block.timestamp, entitlementTypes[i])
        );
      }
    }
  }

  function isEntitled(
    uint256 spaceId,
    uint256 roomId,
    address user,
    DataTypes.EntitlementType entitlementType
  ) public view override returns (bool) {
    if (roomId > 0) {
      uint256 entitlementLen = _entitlementsBySpaceId[spaceId]
      .byUserByRoomId[roomId][user].length;

      for (uint256 i = 0; i < entitlementLen; i++) {
        if (
          _entitlementsBySpaceId[spaceId]
          .byUserByRoomId[roomId][user][i].entitlementType == entitlementType
        ) {
          return true;
        }
      }
    } else {
      uint256 entitlementLen = _entitlementsBySpaceId[spaceId]
        .byUser[user]
        .length;

      for (uint256 i = 0; i < entitlementLen; i++) {
        if (
          _entitlementsBySpaceId[spaceId].byUser[user][i].entitlementType ==
          entitlementType
        ) {
          return true;
        }
      }
    }
    return false;
  }

  function removeEntitlement(
    uint256 spaceId,
    uint256 roomId,
    DataTypes.EntitlementType[] calldata _entitlementTypes,
    bytes calldata entitlementData
  ) external override onlySpaceManager {
    require(
      _isGranted(spaceId, msg.sender),
      "Only the owner can update the entitlements"
    );

    address user = abi.decode(entitlementData, (address));

    for (uint256 i = 0; i < _entitlementTypes.length; i++) {
      if (roomId > 0) {
        uint256 entitlementLen = _entitlementsBySpaceId[spaceId]
        .byUserByRoomId[roomId][user].length;

        for (uint256 j = 0; j < entitlementLen; j++) {
          if (
            _entitlementsBySpaceId[spaceId]
            .byUserByRoomId[roomId][user][j].entitlementType ==
            _entitlementTypes[i]
          ) {
            delete _entitlementsBySpaceId[spaceId].byUserByRoomId[roomId][user][
                j
              ];
          }
        }
      } else {
        uint256 entitlementLen = _entitlementsBySpaceId[spaceId]
          .byUser[user]
          .length;

        for (uint256 j = 0; j < entitlementLen; j++) {
          if (
            _entitlementsBySpaceId[spaceId]
            .byUserByRoomId[roomId][user][j].entitlementType ==
            _entitlementTypes[i]
          ) {
            delete _entitlementsBySpaceId[spaceId].byUserByRoomId[roomId][user][
                j
              ];
          }
        }
      }
    }
  }

  // function getUserEntitlements(
  //   uint256 spaceId,
  //   uint256 roomId,
  //   address user
  // ) public view returns (Entitlement[] memory) {
  //   if (roomId > 0) {
  //     return _entitlementsBySpaceId[spaceId].byUserByRoomId[roomId][user];
  //   } else {
  //     return _entitlementsBySpaceId[spaceId].byUser[user];
  //   }
  // }

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
