// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {IMembershipBase} from "contracts/src/spaces/facets/membership/IMembership.sol";
import {IRuleEntitlement} from "contracts/src/spaces/entitlements/rule/IRuleEntitlement.sol";

// contracts
interface ILegacyArchitectBase {
  // =============================================================
  //                           STRUCTS
  // =============================================================

  // Latest
  struct MembershipRequirements {
    bool everyone;
    address[] users;
    IRuleEntitlement.RuleData ruleData;
    bool syncEntitlements;
  }

  struct Membership {
    IMembershipBase.Membership settings;
    MembershipRequirements requirements;
    string[] permissions;
  }

  struct ChannelInfo {
    string metadata;
  }

  struct SpaceInfo {
    string name;
    string uri;
    string shortDescription;
    string longDescription;
    Membership membership;
    ChannelInfo channel;
  }

  // =============================================================
  //                           EVENTS
  // =============================================================
  event SpaceCreated(
    address indexed owner,
    uint256 indexed tokenId,
    address indexed space
  );

  // =============================================================
  //                           ERRORS
  // =============================================================

  error Architect__InvalidStringLength();
  error Architect__InvalidNetworkId();
  error Architect__InvalidAddress();
  error Architect__NotContract();
}

interface ILegacyArchitect is ILegacyArchitectBase {
  /// @notice Creates a new space
  /// @param SpaceInfo Space information
  function createSpace(SpaceInfo memory SpaceInfo) external returns (address);
}
