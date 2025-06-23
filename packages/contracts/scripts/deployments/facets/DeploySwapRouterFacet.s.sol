// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {ISwapRouter} from "../../../src/router/ISwapRouter.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts
import {SwapRouter} from "../../../src/router/SwapRouter.sol";

library DeploySwapRouterFacet {
    function selectors() internal pure returns (bytes4[] memory res) {
        res = new bytes4[](5);
        res[0] = ISwapRouter.executeSwap.selector;
        res[1] = ISwapRouter.executeSwapWithPermit.selector;
        res[2] = ISwapRouter.getETHInputFees.selector;
        res[3] = ISwapRouter.getPermit2Nonce.selector;
        res[4] = ISwapRouter.getPermit2MessageHash.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function makeInitData(address spaceFactory) internal pure returns (bytes memory) {
        return abi.encodeCall(SwapRouter.__SwapRouter_init, spaceFactory);
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("SwapRouter.sol", "");
    }
}
