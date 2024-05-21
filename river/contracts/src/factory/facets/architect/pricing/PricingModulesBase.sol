// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IPricingModulesBase} from "./IPricingModules.sol";
import {IMembershipPricing} from "contracts/src/spaces/facets/membership/pricing/IMembershipPricing.sol";
import {IERC165} from "contracts/src/diamond/facets/introspection/IERC165.sol";

// libraries
import {PricingModulesStorage} from "./PricingModulesStorage.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts

contract PricingModulesBase is IPricingModulesBase {
  using EnumerableSet for EnumerableSet.AddressSet;

  function _isPricingModule(address module) internal view returns (bool) {
    PricingModulesStorage.Layout storage ds = PricingModulesStorage.layout();
    return ds.pricingModules.contains(module);
  }

  function _addPricingModule(address module) internal {
    PricingModulesStorage.Layout storage ds = PricingModulesStorage.layout();

    if (module == address(0)) {
      revert InvalidPricingModule(module);
    }

    if (!_verifyInterface(module)) {
      revert InvalidPricingModule(module);
    }

    if (ds.pricingModules.contains(module)) {
      revert InvalidPricingModule(module);
    }

    ds.pricingModules.add(module);

    emit PricingModuleAdded(module);
  }

  function _removePricingModule(address module) internal {
    PricingModulesStorage.Layout storage ds = PricingModulesStorage.layout();

    if (module == address(0)) {
      revert InvalidPricingModule(module);
    }

    // verify module exists
    if (!ds.pricingModules.contains(module)) {
      revert InvalidPricingModule(module);
    }

    ds.pricingModules.remove(module);

    emit PricingModuleRemoved(module);
  }

  function _listPricingModules()
    internal
    view
    returns (PricingModule[] memory)
  {
    PricingModulesStorage.Layout storage ds = PricingModulesStorage.layout();
    uint256 length = ds.pricingModules.length();
    PricingModule[] memory pricingModules = new PricingModule[](length);
    for (uint256 i = 0; i < length; i++) {
      address moduleAddress = ds.pricingModules.at(i);
      IMembershipPricing module = IMembershipPricing(moduleAddress);
      pricingModules[i] = PricingModule({
        name: module.name(),
        description: module.description(),
        module: moduleAddress
      });
    }
    return pricingModules;
  }

  // =============================================================
  //                           Internal
  // =============================================================
  function _verifyInterface(address module) internal view returns (bool) {
    return
      IERC165(module).supportsInterface(type(IMembershipPricing).interfaceId);
  }
}
