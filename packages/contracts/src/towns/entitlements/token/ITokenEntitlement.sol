// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries

// contracts

interface ITokenEntitlement {
  struct ExternalToken {
    address contractAddress;
    uint256 quantity;
    bool isSingleToken;
    uint256[] tokenIds;
  }

  /// @notice struct holding information about a single entitlement
  /// @param entitlementId unique id of the entitlement
  /// @param roleId id of the role that the entitlement is gating
  /// @param grantedBy address of the account that granted the entitlement
  /// @param grantedTime timestamp of when the entitlement was granted
  /// @param tokens array of tokens that are required for the entitlement, ANDed together
  struct Entitlement {
    uint256 roleId;
    address grantedBy;
    uint256 grantedTime;
    ExternalToken[] tokens;
  }
}
