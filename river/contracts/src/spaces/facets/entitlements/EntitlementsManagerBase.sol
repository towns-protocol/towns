// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IEntitlementsManagerBase} from "./IEntitlementsManager.sol";

// libraries
import {EntitlementsManagerService} from "contracts/src/spaces/facets/entitlements/EntitlementsManagerService.sol";

// contracts

contract EntitlementsManagerBase is IEntitlementsManagerBase {
  function _addImmutableEntitlements(address[] memory entitlements) internal {
    for (uint256 i = 0; i < entitlements.length; i++) {
      EntitlementsManagerService.validateEntitlement(entitlements[i]);
      EntitlementsManagerService.addEntitlement(entitlements[i], true);
    }
  }

  function _addEntitlementModule(address entitlement) internal {
    // validate permission

    // validate entitlement
    EntitlementsManagerService.validateEntitlement(entitlement);

    // set entitlement
    EntitlementsManagerService.addEntitlement(entitlement, false);

    // emit event
    emit EntitlementModuleAdded(msg.sender, entitlement);
  }

  function _removeEntitlementModule(address entitlement) internal {
    // validate permission

    // validate entitlement
    EntitlementsManagerService.validateEntitlement(entitlement);

    // set entitlement
    EntitlementsManagerService.removeEntitlement(entitlement);

    // emit event
    emit EntitlementModuleRemoved(msg.sender, entitlement);
  }

  function _getEntitlement(
    address entitlement
  ) internal view returns (Entitlement memory module) {
    EntitlementsManagerService.validateEntitlement(entitlement);

    (
      string memory name,
      address entitlementAddress,
      string memory moduleType,
      bool isImmutable
    ) = EntitlementsManagerService.getEntitlement(entitlement);

    module = Entitlement({
      name: name,
      moduleAddress: entitlementAddress,
      moduleType: moduleType,
      isImmutable: isImmutable
    });
  }

  function _getEntitlements()
    internal
    view
    returns (Entitlement[] memory modules)
  {
    address[] memory entitlements = EntitlementsManagerService
      .getEntitlements();

    modules = new Entitlement[](entitlements.length);

    for (uint256 i = 0; i < entitlements.length; i++) {
      (
        string memory name,
        address entitlementAddress,
        string memory moduleType,
        bool isImmutable
      ) = EntitlementsManagerService.getEntitlement(entitlements[i]);

      modules[i] = Entitlement({
        name: name,
        moduleAddress: entitlementAddress,
        moduleType: moduleType,
        isImmutable: isImmutable
      });
    }
  }
}
