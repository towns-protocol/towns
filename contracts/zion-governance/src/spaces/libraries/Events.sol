//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

library Events {
  /**
   * @dev Emitted when a space is created
   * @param owner The address of the owner of the space
   * @param spaceName The name of the space
   * @param spaceId The id of the space
   */
  event CreateSpace(
    uint256 indexed spaceId,
    address indexed creator,
    address indexed owner,
    string spaceName
  );

  event CreateRole(
    uint256 indexed spaceId,
    uint256 indexed roleId,
    address indexed creator,
    string roleName
  );

  /**
   * @dev Emitted when a network id is set on a space
   * @param spaceId The id of the space
   * @param networkId The network id of the space
   */
  event NetworkIdSet(uint256 indexed spaceId, string indexed networkId);

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

  /**
   * @dev Emitted when the default entitlement module is set on the contract
   * @param entitlementAddress The address of the entitlement module
   */
  event DefaultEntitlementSet(address indexed entitlementAddress);

  /**
   * @dev Emitted when the default permission address is set on the contract
   * @param permissionAddress The address of the permission contract
   */
  event DefaultPermissionsManagerSet(address indexed permissionAddress);
}
