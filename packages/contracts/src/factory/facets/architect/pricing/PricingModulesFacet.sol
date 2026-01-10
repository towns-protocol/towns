// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IPricingModules} from "./IPricingModules.sol";

// contracts

import {PricingModulesBase} from "./PricingModulesBase.sol";
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";

contract PricingModulesFacet is IPricingModules, OwnableBase, Facet {
    function __PricingModulesFacet_init(address[] memory pricingModules) external onlyInitializing {
        __PricingModulesFacet_init_unchained(pricingModules);
    }

    function addPricingModule(address pricingModule) external onlyOwner {
        PricingModulesBase.addPricingModule(pricingModule);
    }

    function removePricingModule(address module) external onlyOwner {
        PricingModulesBase.removePricingModule(module);
    }

    function isPricingModule(address module) external view returns (bool) {
        return PricingModulesBase.isPricingModule(module);
    }

    function listPricingModules() external view returns (PricingModule[] memory) {
        return PricingModulesBase.listPricingModules();
    }

    function __PricingModulesFacet_init_unchained(address[] memory pricingModules) internal {
        _addInterface(type(IPricingModules).interfaceId);
        for (uint256 i = 0; i < pricingModules.length; i++) {
            PricingModulesBase.addPricingModule(pricingModules[i]);
        }
    }
}
