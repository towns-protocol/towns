// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IEntitlementsManager} from "./IEntitlementsManager.sol";

// libraries

// contracts
import {EntitlementsManagerBase} from "./EntitlementsManagerBase.sol";
import {Entitled} from "../Entitled.sol";

contract EntitlementsManager is
  IEntitlementsManager,
  EntitlementsManagerBase,
  Entitled
{
  function addImmutableEntitlements(
    address[] memory entitlements
  ) external onlyOwner {
    _addImmutableEntitlements(entitlements);
  }

  function addEntitlementModule(address entitlement) external onlyOwner {
    _addEntitlementModule(entitlement);
  }

  function removeEntitlementModule(address entitlement) external onlyOwner {
    _removeEntitlementModule(entitlement);
  }

  function getEntitlements() external view returns (Entitlement[] memory) {
    return _getEntitlements();
  }

  function getEntitlement(
    address entitlement
  ) external view returns (Entitlement memory) {
    return _getEntitlement(entitlement);
  }

  function isEntitledToSpace(
    address user,
    string calldata permission
  ) external view returns (bool) {
    return _isEntitledToSpace(user, permission);
  }

  function isEntitledToChannel(
    bytes32 channelId,
    address user,
    string calldata permission
  ) external view returns (bool) {
    return _isEntitledToChannel(channelId, user, permission);
  }
}
