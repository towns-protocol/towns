// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IRuleEntitlement} from "contracts/src/crosschain/IRuleEntitlement.sol";

// libraries

// contracts
interface IEntitlementsManagerBase {
  struct Entitlement {
    string name;
    address moduleAddress;
    string moduleType;
    bool isImmutable;
  }

  // =============================================================
  //                           Events
  // =============================================================
  event EntitlementModuleAdded(address indexed caller, address entitlement);
  event EntitlementModuleRemoved(address indexed caller, address entitlement);
}

interface IEntitlementsManager is IEntitlementsManagerBase {
  /// @notice Allows the space owner to add immutable entitlements to the space
  /// @param entitlements The entitlements to add
  function addImmutableEntitlements(address[] memory entitlements) external;

  /// @notice Checks if a user is entitled to a permission in the space
  /// @param user The user to check
  /// @param permission The permission to check
  /// @return True if the user is entitled to the permission, false otherwise
  function isEntitledToSpace(
    address user,
    string calldata permission
  ) external view returns (bool);

  /// @notice Returns the EntitlementData that qualifies for a permission
  /// @param permission The permission to check
  /// @return RuleData describing the tests that must pass for the permission
  function getSpaceEntitlements(
    string calldata permission
  ) external view returns (IRuleEntitlement.RuleData memory);

  /// @notice Checks if a user is entitled to a permission in a channel
  /// @param channelId The channel to check
  /// @param user The user to check
  /// @param permission The permission to check
  /// @return True if the user is entitled to the permission, false otherwise
  function isEntitledToChannel(
    bytes32 channelId,
    address user,
    string calldata permission
  ) external view returns (bool);

  /// @notice Returns the EntitlementData that qualifies for a permission
  /// @param permission The permission to check
  /// @return RuleData describing the tests that must pass for the permission
  function getChannelEntitlements(
    bytes32 channelId,
    string calldata permission
  ) external view returns (IRuleEntitlement.RuleData memory);

  /// @notice Adds an entitlement to the space
  /// @param entitlement The entitlement to add
  function addEntitlementModule(address entitlement) external;

  /// @notice Removes an entitlement from the space
  /// @param entitlement The entitlement to remove
  function removeEntitlementModule(address entitlement) external;

  /// @notice Gets an entitlement from the space
  /// @param entitlement The entitlement to get
  /// @return entitlements The entitlement module address
  function getEntitlement(
    address entitlement
  ) external view returns (Entitlement memory entitlements);

  /// @notice Gets all entitlements from the space
  /// @return entitlements The entitlement modules
  function getEntitlements()
    external
    view
    returns (Entitlement[] memory entitlements);
}
