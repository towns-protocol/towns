// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts
import {PricingModulesFacet} from "src/factory/facets/architect/pricing/PricingModulesFacet.sol";

library DeployPricingModules {
    function selectors() internal pure returns (bytes4[] memory _selectors) {
        _selectors = new bytes4[](4);
        _selectors[0] = PricingModulesFacet.addPricingModule.selector;
        _selectors[1] = PricingModulesFacet.isPricingModule.selector;
        _selectors[2] = PricingModulesFacet.removePricingModule.selector;
        _selectors[3] = PricingModulesFacet.listPricingModules.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function makeInitData(address[] memory pricingModules) internal pure returns (bytes memory) {
        return abi.encodeCall(PricingModulesFacet.__PricingModulesFacet_init, (pricingModules));
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("PricingModulesFacet.sol", "");
    }
}
