//SPDX-License-Identifier: Apache-20
pragma solidity ^0.8.0;

/**
 * @title DataTypes
 * @author HNT Labs
 *
 * @notice A standard library of data types used throughout the Zion Space Manager
 */
library DataTypes {
  /// @notice A struct representing a space
  /// @param spaceId The unique identifier of the space
  /// @param createdAt The timestamp of when the space was created
  /// @param networkSpaceId The unique identifier of the space on the matrix network
  /// @param name The name of the space
  /// @param creator The address of the creator of the space
  /// @param owner The address of the owner of the space
  /// @param rooms An array of rooms in the space
  /// @param entitlement An array of space entitlements
  /// @param entitlementTags An array of space entitlement tags
  struct Space {
    uint256 spaceId;
    uint256 createdAt;
    string networkId;
    string name;
    address creator;
    address owner;
    uint256 ownerRoleId;
    bool disabled;
    mapping(address => bool) hasEntitlement;
    address[] entitlementModules;
    Role[] roles;
  }

  struct Channel {
    uint256 channelId;
    uint256 createdAt;
    string networkId;
    string name;
    address creator;
    bool disabled;
  }

  struct Channels {
    uint256 idCounter;
    Channel[] channels;
  }

  /// @notice A struct representing minimal info for a space
  /// @param spaceId The unique identifier of the space
  /// @param createdAt The timestamp of when the space was created
  /// @param name The name of the space
  /// @param creator The address of the creator of the space
  /// @param owner The address of the owner of the space
  struct SpaceInfo {
    uint256 spaceId;
    string networkId;
    uint256 createdAt;
    string name;
    address creator;
    address owner;
    bool disabled;
  }

  struct ChannelInfo {
    uint256 channelId;
    string networkId;
    uint256 createdAt;
    string name;
    address creator;
    bool disabled;
  }

  struct Roles {
    uint256 idCounter;
    Role[] roles;
  }

  struct Role {
    uint256 roleId;
    string name;
  }

  struct Permission {
    string name;
  }

  /// @notice A struct representing minimal info for an entitlement module
  struct EntitlementModuleInfo {
    address addr;
    string name;
    string moduleType;
    string description;
  }

  struct ExternalToken {
    address contractAddress;
    uint256 quantity;
    bool isSingleToken;
    uint256 tokenId;
  }

  struct ExternalTokenEntitlement {
    ExternalToken[] tokens;
  }
  /// *********************************
  /// **************DTO****************
  /// *********************************

  /// @notice A struct containing the parameters for setting an existing role id to an entitlement module
  struct CreateRoleEntitlementData {
    uint256 roleId;
    address entitlementModule;
    bytes entitlementData;
  }

  /// @notice A struct containing the parameters for creating a role
  struct CreateRoleData {
    string name;
    string metadata;
    Permission[] permissions;
  }

  /// @notice A struct containing the parameters for creating a channel
  struct CreateChannelData {
    string spaceNetworkId;
    string channelName;
    string channelNetworkId;
    uint256[] roleIds;
  }

  /// @notice A struct containing the parameters required for creating a space
  /// @param spaceName The name of the space
  /// @param networkId The network id of the space
  struct CreateSpaceData {
    string spaceName;
    string spaceNetworkId;
  }

  /// @notice A struct containing the parameters required for creating a space with a  token entitlement
  struct CreateSpaceEntitlementData {
    //The role and permissions to create for the associated users or token entitlements
    string roleName;
    Permission[] permissions;
    ExternalTokenEntitlement[] externalTokenEntitlements;
    address[] users;
  }
}
