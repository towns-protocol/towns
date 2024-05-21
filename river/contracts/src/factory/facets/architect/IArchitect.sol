// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {IMembershipBase} from "contracts/src/spaces/facets/membership/IMembership.sol";
import {IUserEntitlement} from "contracts/src/spaces/entitlements/user/IUserEntitlement.sol";
import {IRuleEntitlement} from "contracts/src/spaces/entitlements/rule/IRuleEntitlement.sol";
import {ISpaceOwner} from "contracts/src/spaces/facets/owner/ISpaceOwner.sol";

// contracts
interface IArchitectBase {
  // =============================================================
  //                           STRUCTS
  // =============================================================
  struct MembershipRequirements {
    bool everyone;
    address[] users;
    IRuleEntitlement.RuleData ruleData;
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

interface IArchitect is IArchitectBase {
  // =============================================================
  //                            Registry
  // =============================================================
  function getSpaceByTokenId(
    uint256 tokenId
  ) external view returns (address space);

  function getTokenIdBySpace(address space) external view returns (uint256);

  /// @notice Creates a new space
  /// @param SpaceInfo Space information
  function createSpace(SpaceInfo memory SpaceInfo) external returns (address);

  // =============================================================
  //                         Implementations
  // =============================================================

  function setSpaceArchitectImplementations(
    ISpaceOwner ownerTokenImplementation,
    IUserEntitlement userEntitlementImplementation,
    IRuleEntitlement ruleEntitlementImplementation
  ) external;

  function getSpaceArchitectImplementations()
    external
    view
    returns (
      ISpaceOwner ownerTokenImplementation,
      IUserEntitlement userEntitlementImplementation,
      IRuleEntitlement ruleEntitlementImplementation
    );
}
