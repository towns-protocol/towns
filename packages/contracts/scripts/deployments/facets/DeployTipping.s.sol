// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {ITipping} from "src/spaces/facets/tipping/ITipping.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

library DeployTipping {
    function selectors() internal pure returns (bytes4[] memory res) {
        res = new bytes4[](5);
        res[0] = ITipping.tip.selector;
        res[1] = ITipping.tipsByCurrencyAndTokenId.selector;
        res[2] = ITipping.tippingCurrencies.selector;
        res[3] = ITipping.totalTipsByCurrency.selector;
        res[4] = ITipping.tipAmountByCurrency.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("TippingFacet.sol", "");
    }
}
