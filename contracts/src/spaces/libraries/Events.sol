//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

library Events {
  /**
   * @dev Emitted when a space is created
   * @param owner The address of the owner of the space
   * @param spaceNetworkId The id of the space
   */
  event CreateSpace(string spaceNetworkId, address indexed owner);

  /**
   * @dev Emitted when a channel is created
   * @param spaceNetworkId The id of the space
   * @param channelNetworkId The id of the channel
   * @param owner The address of the creator of the channel
   */
  event CreateChannel(
    string indexed spaceNetworkId,
    string indexed channelNetworkId,
    address indexed owner
  );

  /**
   * @dev Emitted when a space access is updated
   * @param spaceNetworkId The id of the space
   * @param user The address of the user
   * @param disabled The disabled status
   */
  event SetSpaceAccess(
    string indexed spaceNetworkId,
    address indexed user,
    bool disabled
  );

  /**
   * @dev Emitted when a channel access is updated
   * @param spaceNetworkId The id of the space
   * @param channelNetworkId The id of the channel
   * @param user The address of the user
   * @param disabled The disabled status
   */
  event SetChannelAccess(
    string indexed spaceNetworkId,
    string indexed channelNetworkId,
    address indexed user,
    bool disabled
  );

  /**
   * @dev Emitted when the default entitlement module is set on the contract
   * @param entitlementAddress The address of the entitlement module
   */
  event DefaultEntitlementSet(address indexed entitlementAddress);

  /**
   * @dev Emitted when the space nft address is set on the contract
   * @param spaceNFTAddress The address of the space nft
   */
  event SpaceNFTAddressSet(address indexed spaceNFTAddress);

  /**
   * @dev Emitted when an entitlement module is white listed on a space
   * @param spaceNetworkId The id of the space
   * @param entitlementAddress The address of the entitlement module
   */
  event WhitelistEntitlementModule(
    string indexed spaceNetworkId,
    address indexed entitlementAddress,
    bool whitelist
  );

  /**
   * @dev Emitted when a role is created
   * @param spaceId The id of the space
   * @param roleId The id of the role
   * @param roleName The name of the role
   */
  event CreateRole(
    string indexed spaceId,
    uint256 indexed roleId,
    string indexed roleName,
    address creator
  );

  /**
   * @dev Emitted when a role is created
   * @param spaceId The id of the space
   * @param roleId The id of the role
   * @param roleName The name of the role
   */
  event CreateRoleWithEntitlementData(
    string indexed spaceId,
    uint256 indexed roleId,
    string indexed roleName,
    address creator
  );

  /**
   * @dev Emitted when a role is modified
   * @param spaceId The id of the space
   * @param roleId The id of the role
   */
  event ModifyRoleWithEntitlementData(
    string indexed spaceId,
    uint256 indexed roleId,
    address updater
  );

  /**
   * @dev Emitted when a role is updated
   * @param spaceId The id of the space
   * @param roleId The id of the role
   */
  event RemoveRole(
    string indexed spaceId,
    uint256 indexed roleId,
    address updater
  );

  /**
   * @dev Emitted when a role is updated
   * @param spaceId The id of the space
   * @param roleId The id of the role
   */
  event UpdateRole(
    string indexed spaceId,
    uint256 indexed roleId,
    address updater
  );

  /**
   * @dev Emitted when an entitlement module is added to a space
   * @param spaceId The id of the space
   * @param entitlementAddress The address of the entitlement module
   */
  event EntitlementModuleAdded(
    string indexed spaceId,
    address indexed entitlementAddress
  );

  /**
   * @dev Emitted when an entitlement module is removed from a space
   * @param spaceId The id of the space
   * @param entitlementAddress The address of the entitlement module
   */
  event EntitlementModuleRemoved(
    string indexed spaceId,
    address indexed entitlementAddress
  );
}
