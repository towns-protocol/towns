// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
interface IEntitlementDataQueryableBase {
  struct EntitlementData {
    string entitlementType;
    bytes entitlementData;
  }
}

interface IEntitlementDataQueryable is IEntitlementDataQueryableBase {
  // Entitlement data pertaining to all roles in the space.
  function getEntitlementDataByPermission(
    string calldata permission
  ) external view returns (EntitlementData[] memory);

  // Entitlement data pertaining to all roles assigned to a channel.
  function getChannelEntitlementDataByPermission(
    bytes32 channelId,
    string calldata permission
  ) external view returns (EntitlementData[] memory);
}
