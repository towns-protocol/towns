//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

library SpaceStructs {
  struct Space {
    uint256 spaceId;
    uint256 createdAt;
    uint256 networkSpaceId;
    string name;
    address creatorAddress;
    address ownerAddress;
    Room[] rooms;
    //other entitlement decisions not handled e.g. timestamps, chainlink, etc.
    //how to ensure dynamic address follows interface
    mapping(string => address) entitlementModuleAddresses;
    string[] entitlementModuleTags;
  }

  struct Room {
    uint256 roomId;
    uint256 createdAt;
    string name;
    address creatorAddress;
  }

  enum EntitlementType {
    Administrator,
    Moderator,
    Join,
    Leave,
    Read,
    Write,
    Block,
    Redact,
    Add_Channel,
    Remove_Channel
  }

  struct Entitlement {
    address grantedBy;
    uint256 grantedTime;
    EntitlementType entitlementType;
  }
}
