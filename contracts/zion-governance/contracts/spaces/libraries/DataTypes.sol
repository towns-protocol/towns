//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

/**
 * @title DataTypes
 * @author HNT Labs
 *
 * @notice A standard library of data types used throughout the Zion Space Manager.
 */
library DataTypes {
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
    string networkId;
    string name;
    address creator;
    address owner;
    uint256 roomId;
    mapping(string => address) entitlements;
    string[] entitlementTags;
    // status Status
  }

  /// @notice A struct representing minimal info for a space.
  /// @param spaceId The unique identifier of the space.
  /// @param createdAt The timestamp of when the space was created.
  /// @param name The name of the space.
  /// @param creator The address of the creator of the space.
  /// @param owner The address of the owner of the space.
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

  /// @notice A struct containing the parameters required for creating a space.
  /// @param spaceName The name of the space.
  /// @param networkId The network id of the space.
  struct CreateSpaceData {
    string spaceName;
    string networkId;
  }

  /// @notice A struct containing the parameters required for creating a space with a  token entitlement.
  struct CreateSpaceTokenEntitlementData {
    address entitlementModuleAddress;
    address tokenAddress;
    uint256 quantity;
    string description;
    EntitlementType[] entitlementTypes;
  }

  struct CreateSpacePurchaseableEntitlementData {
    address entitlementModuleAddress;
    address tokenAddress;
    uint256 quantity;
    uint256 price;
    string description;
    EntitlementType[] entitlementTypes;
  }

  /// @notice A struct containing the parameters required for setting an entitlement.
  struct SetEntitlementData {
    uint256 spaceId;
    uint256 roomId;
    EntitlementType[] entitlementTypes;
    bytes entitlementData;
  }
}
