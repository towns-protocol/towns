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
    address indexed owner,
    string indexed spaceName,
    uint256 indexed spaceId
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
   * @param entitlementTag The tag of the entitlement module
   */
  event EntitlementModuleAdded(
    uint256 indexed spaceId,
    address indexed entitlementAddress,
    string indexed entitlementTag
  );

  /**
   * @dev Emitted when the default entitlement module is set on the contract
   * @param entitlementAddress The address of the entitlement module
   * @param entitlementTag The tag of the entitlement module
   */
  event DefaultEntitlementSet(
    address indexed entitlementAddress,
    string indexed entitlementTag
  );
}
