// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries
import {IMembershipBase} from "contracts/src/spaces/facets/membership/IMembership.sol";
import {IUserEntitlement} from "contracts/src/spaces/entitlements/user/IUserEntitlement.sol";
import {IRuleEntitlement} from "contracts/src/crosschain/IRuleEntitlement.sol";
import {IWalletLink} from "contracts/src/river/wallet-link/IWalletLink.sol";

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
    string id;
    string metadata;
  }

  struct SpaceInfo {
    string id;
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
    uint256 indexed spaceId,
    address space
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

  /// @notice Returns the address of a space by its spaceId
  /// @param spaceId Space identifier
  /// @return Address of the space
  function getSpaceById(string memory spaceId) external view returns (address);

  function getTokenIdBySpaceId(
    string memory spaceId
  ) external view returns (uint256);

  function getTokenIdBySpace(address space) external view returns (uint256);

  function isSpace(address space) external view returns (bool);

  /// @notice Creates a new space
  /// @param SpaceInfo Space information
  function createSpace(SpaceInfo memory SpaceInfo) external returns (address);

  // =============================================================
  //                         Implementations
  // =============================================================

  function setSpaceArchitectImplementations(
    address ownerTokenImplementation,
    IUserEntitlement userEntitlementImplementation,
    IRuleEntitlement ruleEntitlementImplementation,
    IWalletLink walletLink
  ) external;

  function getSpaceArchitectImplementations()
    external
    view
    returns (
      address ownerTokenImplementation,
      IUserEntitlement userEntitlementImplementation,
      IRuleEntitlement ruleEntitlementImplementation,
      IWalletLink walletLink
    );
}
