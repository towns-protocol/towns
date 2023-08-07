// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IEntitlement} from "contracts/src/towns/entitlements/IEntitlement.sol";
import {IERC165} from "contracts/src/diamond/facets/introspection/IERC165.sol";

// libraries
import {EnumerableSet} from "openzeppelin-contracts/contracts/utils/structs/EnumerableSet.sol";
import {EntitlementsStorage} from "./EntitlementsStorage.sol";

// contracts
error EntitlementsService__InvalidEntitlementAddress();
error EntitlementsService__InvalidEntitlementInterface();

error EntitlementsService__ImmutableEntitlement();
error EntitlementsService__EntitlementDoesNotExist();
error EntitlementsService__EntitlementAlreadyExists();

library EntitlementsService {
  using EnumerableSet for EnumerableSet.AddressSet;
  using EntitlementsStorage for EntitlementsStorage.Layout;

  string internal constant IN_TOWN = "";

  function checkEntitlement(address entitlement) internal view {
    EntitlementsStorage.Layout storage ds = EntitlementsStorage.layout();

    if (ds.entitlementByAddress[entitlement].entitlement == address(0)) {
      revert EntitlementsService__EntitlementDoesNotExist();
    }
  }

  function addEntitlement(address entitlement, bool isImmutable) internal {
    EntitlementsStorage.Layout storage ds = EntitlementsStorage.layout();

    if (ds.entitlementByAddress[entitlement].entitlement != address(0)) {
      revert EntitlementsService__EntitlementAlreadyExists();
    }

    ds.entitlements.add(entitlement);
    ds.entitlementByAddress[entitlement] = EntitlementsStorage.Entitlement({
      entitlement: entitlement,
      isImmutable: isImmutable
    });
  }

  function removeEntitlement(address entitlement) internal {
    EntitlementsStorage.Layout storage ds = EntitlementsStorage.layout();

    if (ds.entitlementByAddress[entitlement].entitlement == address(0)) {
      revert EntitlementsService__EntitlementDoesNotExist();
    }

    if (ds.entitlementByAddress[entitlement].isImmutable) {
      revert EntitlementsService__ImmutableEntitlement();
    }

    ds.entitlements.remove(entitlement);
    delete ds.entitlementByAddress[entitlement].entitlement;
    delete ds.entitlementByAddress[entitlement];
  }

  function getEntitlement(
    address entitlement
  )
    internal
    view
    returns (
      string memory name,
      address moduleAddress,
      string memory moduleType,
      bool isImmutable
    )
  {
    EntitlementsStorage.Layout storage ds = EntitlementsStorage.layout();

    if (ds.entitlementByAddress[entitlement].entitlement == address(0)) {
      revert EntitlementsService__EntitlementDoesNotExist();
    }

    return (
      IEntitlement(entitlement).name(),
      ds.entitlementByAddress[entitlement].entitlement,
      IEntitlement(entitlement).moduleType(),
      ds.entitlementByAddress[entitlement].isImmutable
    );
  }

  function getEntitlements()
    internal
    view
    returns (address[] memory entitlements)
  {
    return EntitlementsStorage.layout().entitlements.values();
  }

  // =============================================================
  //                           Validation
  // =============================================================

  function validateEntitlement(address entitlement) internal view {
    if (entitlement == address(0)) {
      revert EntitlementsService__InvalidEntitlementAddress();
    }

    try
      IERC165(entitlement).supportsInterface(type(IEntitlement).interfaceId)
    returns (bool supported) {
      if (!supported) {
        revert EntitlementsService__InvalidEntitlementInterface();
      }
    } catch {
      revert EntitlementsService__InvalidEntitlementInterface();
    }
  }

  // =============================================================
  //                        Proxy Methods
  // =============================================================
  function proxyGetEntitlementDataByRole(
    address entitlement,
    uint256 role
  ) internal view returns (bytes[] memory) {
    checkEntitlement(entitlement);
    return IEntitlement(entitlement).getEntitlementDataByRoleId(role);
  }

  function proxyAddRoleToEntitlement(
    address entitlement,
    uint256 role,
    bytes memory entitlementData
  ) internal {
    checkEntitlement(entitlement);
    IEntitlement(entitlement).setEntitlement(role, entitlementData);
  }

  function proxyRemoveRoleFromEntitlement(
    address entitlement,
    uint256 role,
    bytes memory entitlementData
  ) internal {
    checkEntitlement(entitlement);
    IEntitlement(entitlement).removeEntitlement(role, entitlementData);
  }
}
