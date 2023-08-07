// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IEntitlementsBase} from "./IEntitlements.sol";

// libraries
import {EntitlementsService} from "contracts/src/towns/facets/entitlements/EntitlementsService.sol";

// contracts

contract EntitlementsBase is IEntitlementsBase {
  function _addImmutableEntitlements(address[] memory entitlements) internal {
    for (uint256 i = 0; i < entitlements.length; i++) {
      EntitlementsService.validateEntitlement(entitlements[i]);
      EntitlementsService.addEntitlement(entitlements[i], true);
    }
  }

  function _addEntitlement(address entitlement) internal {
    // validate permission

    // validate entitlement
    EntitlementsService.validateEntitlement(entitlement);

    // set entitlement
    EntitlementsService.addEntitlement(entitlement, false);
  }

  function _removeEntitlement(address entitlement) internal {
    // validate permission

    // validate entitlement
    EntitlementsService.validateEntitlement(entitlement);

    // set entitlement
    EntitlementsService.removeEntitlement(entitlement);
  }

  function _getEntitlement(
    address entitlement
  ) internal view returns (Entitlement memory module) {
    EntitlementsService.validateEntitlement(entitlement);

    (
      string memory name,
      address entitlementAddress,
      string memory moduleType,
      bool isImmutable
    ) = EntitlementsService.getEntitlement(entitlement);

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
    address[] memory entitlements = EntitlementsService.getEntitlements();

    modules = new Entitlement[](entitlements.length);

    for (uint256 i = 0; i < entitlements.length; i++) {
      (
        string memory name,
        address entitlementAddress,
        string memory moduleType,
        bool isImmutable
      ) = EntitlementsService.getEntitlement(entitlements[i]);

      modules[i] = Entitlement({
        name: name,
        moduleAddress: entitlementAddress,
        moduleType: moduleType,
        isImmutable: isImmutable
      });
    }
  }
}
