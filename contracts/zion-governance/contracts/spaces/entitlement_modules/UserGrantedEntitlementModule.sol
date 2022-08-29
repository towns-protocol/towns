//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./ISpaceEntitlementModule.sol";
import "../ISpaceManager.sol";

contract UserGrantedEntitlementModule is ISpaceEntitlementModule {
  address zionSpaceManagerAddress;

  mapping(uint256 => SpaceUserEntitlements) spaceUserEntitlements;

  struct SpaceUserEntitlements {
    mapping(address => SpaceStructs.Entitlement[]) userEntitlements;
    mapping(uint256 => RoomUserEntitlements) roomUserEntitlements;
  }

  struct RoomUserEntitlements {
    mapping(address => SpaceStructs.Entitlement[]) userEntitlements;
  }

  constructor(address _zionSpaceManagerAddress) {
    zionSpaceManagerAddress = _zionSpaceManagerAddress;
  }

  function addUserEntitlements(
    uint256 spaceId,
    uint256 roomId,
    address userAddress,
    SpaceStructs.EntitlementType[] calldata entitlementTypes
  ) public {
    ISpaceManager zionSpaceManager = ISpaceManager(zionSpaceManagerAddress);

    address ownerAddress = zionSpaceManager.getSpaceOwner(spaceId);

    console.log("ownerAddress", ownerAddress);
    console.log("MsgSEnder", msg.sender);

    //need the second check to add user entitlements during space creation (otherwise could do a separate call to addUserEntitlements)
    require(
      ownerAddress == msg.sender || msg.sender == zionSpaceManagerAddress,
      "Only the owner can update the entitlements"
    );

    //more efficient to just add rather than check if already exists
    for (uint256 i = 0; i < entitlementTypes.length; i++) {
      SpaceStructs.Entitlement memory entitlement = SpaceStructs.Entitlement({
        grantedBy: userAddress,
        grantedTime: block.timestamp,
        entitlementType: entitlementTypes[i]
      });

      if (roomId > 0) {
        spaceUserEntitlements[spaceId]
          .roomUserEntitlements[roomId]
          .userEntitlements[userAddress]
          .push(entitlement);
      } else {
        spaceUserEntitlements[spaceId].userEntitlements[userAddress].push(
          entitlement
        );
      }
    }
  }

  function removeUserEntitlements(
    address originAddress, // should we check msg.sender instead?
    uint256 spaceId,
    uint256 roomId,
    address userAddress,
    SpaceStructs.EntitlementType[] calldata entitlementTypes
  ) public {
    ISpaceManager zionSpaceManager = ISpaceManager(zionSpaceManagerAddress);

    address ownerAddress = zionSpaceManager.getSpaceOwner(spaceId);

    require(
      ownerAddress == originAddress,
      "Only the owner can update the entitlements"
    );

    //dont break out of delete early if we are potentially adding dups on create
    for (uint256 i = 0; i < entitlementTypes.length; i++) {
      //check if we need to remove entitlement from a specific room
      if (roomId > 0) {
        SpaceStructs.Entitlement[]
          memory userEntitlements = spaceUserEntitlements[spaceId]
            .roomUserEntitlements[roomId]
            .userEntitlements[userAddress];
        for (uint256 j = 0; j < userEntitlements.length; j++) {
          if (userEntitlements[j].entitlementType == entitlementTypes[i]) {
            delete spaceUserEntitlements[spaceId]
              .roomUserEntitlements[roomId]
              .userEntitlements[userAddress][j];
          }
        }
      } else {
        SpaceStructs.Entitlement[]
          memory userEntitlements = spaceUserEntitlements[spaceId]
            .userEntitlements[userAddress];
        for (uint256 j = 0; j < userEntitlements.length; j++) {
          if (userEntitlements[j].entitlementType == entitlementTypes[i]) {
            delete spaceUserEntitlements[spaceId].userEntitlements[userAddress][
                j
              ];
          }
        }
      }
    }
  }

  function isEntitled(
    uint256 spaceId,
    uint256 roomId,
    address userAddress,
    SpaceStructs.EntitlementType entitlementType
  ) public view returns (bool) {
    if (roomId > 0) {
      SpaceStructs.Entitlement[] memory entitlements = spaceUserEntitlements[
        spaceId
      ].roomUserEntitlements[roomId].userEntitlements[userAddress];

      for (uint256 i = 0; i < entitlements.length; i++) {
        if (entitlements[i].entitlementType == entitlementType) {
          return true;
        }
      }
    } else {
      SpaceStructs.Entitlement[] memory entitlements = spaceUserEntitlements[
        spaceId
      ].userEntitlements[userAddress];
      for (uint256 i = 0; i < entitlements.length; i++) {
        if (entitlements[i].entitlementType == entitlementType) {
          return true;
        }
      }
    }
    return false;
  }

  function getUserEntitlements(
    uint256 spaceId,
    uint256 roomId,
    address userAddress
  ) public view returns (SpaceStructs.Entitlement[] memory) {
    if (roomId > 0) {
      return
        spaceUserEntitlements[spaceId]
          .roomUserEntitlements[roomId]
          .userEntitlements[userAddress];
    } else {
      return spaceUserEntitlements[spaceId].userEntitlements[userAddress];
    }
  }
}
