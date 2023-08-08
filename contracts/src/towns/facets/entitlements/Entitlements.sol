// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IEntitlements} from "./IEntitlements.sol";

// libraries

// contracts
import {EntitlementsBase} from "./EntitlementsBase.sol";
import {Entitled} from "../Entitled.sol";

contract Entitlements is IEntitlements, EntitlementsBase, Entitled {
  function addImmutableEntitlements(
    address[] memory entitlements
  ) external onlyOwner {
    _addImmutableEntitlements(entitlements);
  }

  function addEntitlement(address entitlement) external onlyOwner {
    _addEntitlement(entitlement);
  }

  function removeEntitlement(address entitlement) external onlyOwner {
    _removeEntitlement(entitlement);
  }

  function getEntitlements() external view returns (Entitlement[] memory) {
    return _getEntitlements();
  }

  function getEntitlement(
    address entitlement
  ) external view returns (Entitlement memory) {
    return _getEntitlement(entitlement);
  }

  function isEntitledToTown(
    address user,
    string calldata permission
  ) external view returns (bool) {
    return _isEntitledToTown(user, permission);
  }

  function isEntitledToChannel(
    string calldata channelId,
    address user,
    string calldata permission
  ) external view returns (bool) {
    return _isEntitledToChannel(channelId, user, permission);
  }
}
