// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// interfaces
import {IPricingModules} from "src/factory/facets/architect/pricing/IPricingModules.sol";

// helpers
import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";

// contracts
import {PricingModulesFacet} from "src/factory/facets/architect/pricing/PricingModulesFacet.sol";

contract PricingModulesHelper is FacetHelper {
    constructor() {
        addSelector(IPricingModules.addPricingModule.selector);
        addSelector(IPricingModules.isPricingModule.selector);
        addSelector(IPricingModules.removePricingModule.selector);
        addSelector(IPricingModules.listPricingModules.selector);
    }

    function initializer() public pure override returns (bytes4) {
        return PricingModulesFacet.__PricingModulesFacet_init.selector;
    }

    function selectors() public view override returns (bytes4[] memory) {
        return functionSelectors;
    }
}
