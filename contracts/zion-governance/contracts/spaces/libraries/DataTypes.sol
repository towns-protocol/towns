//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

/**
 * @title DataTypes
 * @author HNT Labs
 *
 * @notice A standard library of data types used throughout the Zion Space Manager.
 */
library DataTypes {
  // Entities
  struct Room {
    uint256 roomId;
    uint256 createdAt;
    string name;
    address creatorAddress;
  }

  struct Space {
    uint256 spaceId;
    uint256 createdAt;
    string networkSpaceId; // change to string
    string name;
    address creator;
    address owner; // can be the nft owner
    Space[] rooms; // mapping(uint256 => Room)
    mapping(string => address) entitlements;
    string[] entitlementTags;
  }

  struct SpaceInfo {
    uint256 spaceId;
    uint256 createdAt;
    string name;
    address creator;
    address owner;
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

  // DTO
  struct CreateSpaceData {
    string spaceName;
    address[] entitlements;
  }

  struct AddEntitlementData {
    uint256 spaceId;
    address entitlement;
    string entitlementTag;
  }

  /// @notice A struct containing the parameters required to modify entitlement types to an entitlement module.
  struct EntitlementData {
    uint256 spaceId;
    uint256 roomId;
    address user;
    EntitlementType[] entitlementTypes;
  }

  struct TokenEntitlementData {
    uint256 spaceId;
    uint256 roomId;
    string description;
    address[] tokens;
    uint256[] quantities;
    EntitlementType[] entitlementTypes;
  }
}
