//SPDX-License-Identifier: Apache-20
pragma solidity 0.8.17;

/**
 * @title DataTypes
 * @author HNT Labs
 *
 * @notice A standard library of data types used throughout the Zion Space Manager
 */
library DataTypes {
  struct Channel {
    string name;
    string channelNetworkId;
    bytes32 channelHash;
    uint256 createdAt;
    bool disabled;
  }

  struct Role {
    uint256 roleId;
    string name;
  }

  struct Entitlement {
    address module;
    bytes data;
  }

  struct EntitlementModule {
    string name;
    address module;
    string moduleType;
    bool enabled;
  }

  struct ExternalToken {
    address contractAddress;
    uint256 quantity;
    bool isSingleToken;
    uint256[] tokenIds;
  }

  /// *********************************
  /// **************DTO****************
  /// *********************************
  /// @notice A struct containing the parameters required for creating a space
  /// @param spaceName The name of the space
  /// @param networkId The network id of the space
  struct CreateSpaceData {
    string spaceName;
    string spaceNetworkId;
    string spaceMetadata;
  }

  /// @notice A struct containing the parameters required for creating a space with a  token entitlement
  struct CreateSpaceExtraEntitlements {
    //The role and permissions to create for the associated users or token entitlements
    string roleName;
    string[] permissions;
    ExternalToken[] tokens;
    address[] users;
  }
}
