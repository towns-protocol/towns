// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {ISwapFacet} from "src/spaces/facets/swap/ISwapFacet.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts

library DeploySwapFacet {
    function selectors() internal pure returns (bytes4[] memory res) {
        res = new bytes4[](5);
        res[0] = ISwapFacet.setSwapFeeConfig.selector;
        res[1] = ISwapFacet.executeSwap.selector;
        res[2] = ISwapFacet.executeSwapWithPermit.selector;
        res[3] = ISwapFacet.getSwapFees.selector;
        res[4] = ISwapFacet.getSwapRouter.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("SwapFacet.sol", "");
    }
}
