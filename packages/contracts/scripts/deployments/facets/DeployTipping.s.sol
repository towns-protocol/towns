// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {ITipping} from "src/spaces/facets/tipping/ITipping.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

library DeployTipping {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(8);
        arr.p(ITipping.sendTip.selector);
        arr.p(ITipping.tip.selector);
        arr.p(ITipping.tipsByWalletAndCurrency.selector);
        arr.p(ITipping.tipCountByWalletAndCurrency.selector);
        arr.p(ITipping.tipsByCurrencyAndTokenId.selector);
        arr.p(ITipping.tippingCurrencies.selector);
        arr.p(ITipping.totalTipsByCurrency.selector);
        arr.p(ITipping.tipAmountByCurrency.selector);

        bytes32[] memory selectors_ = arr.asBytes32Array();
        assembly ("memory-safe") {
            res := selectors_
        }
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
