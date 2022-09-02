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

  /// @notice A struct representing a space.
  /// @param spaceId The unique identifier of the space.
  /// @param createdAt The timestamp of when the space was created.
  /// @param networkSpaceId The unique identifier of the space on the matrix network.
  /// @param name The name of the space.
  /// @param creator The address of the creator of the space.
  /// @param owner The address of the owner of the space.
  /// @param rooms An array of rooms in the space.
  /// @param entitlement An array of space entitlements.
  /// @param entitlementTags An array of space entitlement tags.
  struct Space {
    uint256 spaceId;
    uint256 createdAt;
    string networkSpaceId;
    string name;
    address creator;
    address owner;
    Space[] rooms;
    mapping(string => address) entitlements;
    string[] entitlementTags;
    // status Status
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

  /// @notice A struct representing an entitlement.
  /// @param grantedBy The address of the account that granted the entitlement.
  /// @param grantedTime The time at which the entitlement was granted.
  /// @param entitlementType The type of entitlement.
  struct Entitlement {
    address grantedBy;
    uint256 grantedTime;
    EntitlementType entitlementType;
  }

  /// @notice A struct containing the parameters required for creating a space.
  /// @param spaceName The name of the space.
  /// @param entitlements The entitlements to be granted to the space.
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
