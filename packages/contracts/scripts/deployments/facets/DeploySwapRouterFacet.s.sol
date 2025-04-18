// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {ISwapRouter} from "src/base/swap/ISwapRouter.sol";

// libraries
import {DeployLib} from "@towns-protocol/diamond/scripts/common/DeployLib.sol";

// contracts

library DeploySwapRouterFacet {
    function selectors() internal pure returns (bytes4[] memory res) {
        res = new bytes4[](2);
        res[0] = ISwapRouter.executeSwap.selector;
        res[1] = ISwapRouter.executeSwapWithPermit.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function deploy() internal returns (address) {
        return DeployLib.deployCode("SwapRouter.sol", "");
    }
}
