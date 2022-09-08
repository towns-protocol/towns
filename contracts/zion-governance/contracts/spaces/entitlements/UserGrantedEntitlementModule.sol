//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {ISpaceManager} from "./../interfaces/ISpaceManager.sol";
import {ISpaceEntitlementModule} from "./../interfaces/ISpaceEntitlementModule.sol";
import {DataTypes} from "./../libraries/DataTypes.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

contract UserGrantedEntitlementModule is ERC165, ISpaceEntitlementModule {
  address public immutable zionSpaceManagerAddress;

  // Storage
  struct Entitlement {
    address grantedBy;
    uint256 grantedTime;
    DataTypes.EntitlementType entitlementType;
  }

  struct RoomUserEntitlements {
    mapping(address => Entitlement[]) entitlementsByAddress;
  }

  struct SpaceUserEntitlements {
    mapping(address => Entitlement[]) entitlementsByAddress;
    mapping(uint256 => RoomUserEntitlements) roomEntitlementsByRoomId;
  }

  mapping(uint256 => SpaceUserEntitlements) internal entitlementsBySpaceId;

  constructor(address _zionSpaceManagerAddress) {
    zionSpaceManagerAddress = _zionSpaceManagerAddress;
  }

  function setEntitlement(DataTypes.SetEntitlementData calldata vars) public {
    ISpaceManager zionSpaceManager = ISpaceManager(zionSpaceManagerAddress);
    address ownerAddress = zionSpaceManager.getSpaceOwnerBySpaceId(
      vars.spaceId
    );

    require(
      ownerAddress == msg.sender || msg.sender == zionSpaceManagerAddress,
      "Only the owner can update the entitlements"
    );

    address user = abi.decode(vars.entitlementData, (address));

    for (uint256 i = 0; i < vars.entitlementTypes.length; i++) {
      Entitlement memory entitlement = Entitlement(
        user,
        block.timestamp,
        vars.entitlementTypes[i]
      );

      if (vars.roomId > 0) {
        entitlementsBySpaceId[vars.spaceId]
          .roomEntitlementsByRoomId[vars.roomId]
          .entitlementsByAddress[user]
          .push(entitlement);
      } else {
        entitlementsBySpaceId[vars.spaceId].entitlementsByAddress[user].push(
          entitlement
        );
      }
    }
  }

  function isEntitled(
    uint256 spaceId,
    uint256 roomId,
    address user,
    DataTypes.EntitlementType entitlementType
  ) public view returns (bool) {
    if (roomId > 0) {
      Entitlement[] memory entitlements = entitlementsBySpaceId[spaceId]
        .roomEntitlementsByRoomId[roomId]
        .entitlementsByAddress[user];

      for (uint256 i = 0; i < entitlements.length; i++) {
        if (entitlements[i].entitlementType == entitlementType) {
          return true;
        }
      }
    } else {
      Entitlement[] memory entitlements = entitlementsBySpaceId[spaceId]
        .entitlementsByAddress[user];
      for (uint256 i = 0; i < entitlements.length; i++) {
        if (entitlements[i].entitlementType == entitlementType) {
          return true;
        }
      }
    }
    return false;
  }

  function removeUserEntitlement(
    address originAddress,
    uint256 spaceId,
    uint256 roomId,
    address user,
    DataTypes.EntitlementType[] calldata _entitlementTypes
  ) public {
    ISpaceManager zionSpaceManager = ISpaceManager(zionSpaceManagerAddress);
    address ownerAddress = zionSpaceManager.getSpaceOwnerBySpaceId(spaceId);

    if (ownerAddress != originAddress) {
      revert("Only the owner can update entitlements");
    }

    for (uint256 i = 0; i < _entitlementTypes.length; i++) {
      if (roomId > 0) {
        Entitlement[] storage entitlements = entitlementsBySpaceId[spaceId]
          .roomEntitlementsByRoomId[roomId]
          .entitlementsByAddress[user];

        for (uint256 j = 0; j < entitlements.length; j++) {
          if (entitlements[j].entitlementType == _entitlementTypes[i]) {
            delete entitlements[j];
          }
        }
      } else {
        Entitlement[] storage entitlements = entitlementsBySpaceId[spaceId]
          .entitlementsByAddress[user];

        for (uint256 j = 0; j < entitlements.length; j++) {
          if (entitlements[j].entitlementType == _entitlementTypes[i]) {
            delete entitlements[j];
          }
        }
      }
    }
  }

  function getUserEntitlements(
    uint256 spaceId,
    uint256 roomId,
    address user
  ) public view returns (Entitlement[] memory) {
    if (roomId > 0) {
      return
        entitlementsBySpaceId[spaceId]
          .roomEntitlementsByRoomId[roomId]
          .entitlementsByAddress[user];
    } else {
      return entitlementsBySpaceId[spaceId].entitlementsByAddress[user];
    }
  }

  function supportsInterface(bytes4 interfaceId)
    public
    view
    virtual
    override(ERC165)
    returns (bool)
  {
    return
      interfaceId == type(ISpaceEntitlementModule).interfaceId ||
      super.supportsInterface(interfaceId);
  }
}
