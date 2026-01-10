// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

import {IPricingModulesBase} from "./IPricingModules.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IMembershipPricing} from "src/spaces/facets/membership/pricing/IMembershipPricing.sol";

// libraries
import {PricingModulesStorage} from "./PricingModulesStorage.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";

// contracts

library PricingModulesBase {
    using EnumerableSet for EnumerableSet.AddressSet;

    function addPricingModule(address module) internal {
        PricingModulesStorage.Layout storage ds = PricingModulesStorage.layout();

        if (module == address(0)) {
            CustomRevert.revertWith(IPricingModulesBase.InvalidPricingModule.selector, module);
        }

        if (!verifyInterface(module)) {
            CustomRevert.revertWith(IPricingModulesBase.InvalidPricingModule.selector, module);
        }

        if (ds.pricingModules.contains(module)) {
            CustomRevert.revertWith(IPricingModulesBase.InvalidPricingModule.selector, module);
        }

        ds.pricingModules.add(module);

        emit IPricingModulesBase.PricingModuleAdded(module);
    }

    function removePricingModule(address module) internal {
        PricingModulesStorage.Layout storage ds = PricingModulesStorage.layout();

        if (module == address(0)) {
            CustomRevert.revertWith(IPricingModulesBase.InvalidPricingModule.selector, module);
        }

        // verify module exists
        if (!ds.pricingModules.contains(module)) {
            CustomRevert.revertWith(IPricingModulesBase.InvalidPricingModule.selector, module);
        }

        ds.pricingModules.remove(module);

        emit IPricingModulesBase.PricingModuleRemoved(module);
    }

    function isPricingModule(address module) internal view returns (bool) {
        PricingModulesStorage.Layout storage ds = PricingModulesStorage.layout();
        return ds.pricingModules.contains(module);
    }

    function listPricingModules()
        internal
        view
        returns (IPricingModulesBase.PricingModule[] memory)
    {
        PricingModulesStorage.Layout storage ds = PricingModulesStorage.layout();
        uint256 length = ds.pricingModules.length();
        IPricingModulesBase.PricingModule[]
            memory pricingModules = new IPricingModulesBase.PricingModule[](length);
        for (uint256 i = 0; i < length; i++) {
            address moduleAddress = ds.pricingModules.at(i);
            IMembershipPricing module = IMembershipPricing(moduleAddress);
            pricingModules[i] = IPricingModulesBase.PricingModule({
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
    function verifyInterface(address module) internal view returns (bool) {
        return IERC165(module).supportsInterface(type(IMembershipPricing).interfaceId);
    }
}
