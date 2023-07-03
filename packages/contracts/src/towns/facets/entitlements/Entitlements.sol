// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IEntitlements} from "./IEntitlements.sol";

// libraries

// contracts
import {EntitlementsController} from "./EntitlementsController.sol";

contract Entitlements is EntitlementsController, IEntitlements {
  function addImmutableEntitlements(address[] memory entitlements) external {
    _addImmutableEntitlements(entitlements);
  }

  function addEntitlement(address entitlement) external {
    _addEntitlement(entitlement);
  }

  function removeEntitlement(address entitlement) external {
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
