// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts
import {XChain} from "src/base/registry/facets/xchain/XChain.sol";

library DeployXChain {
    function selectors() internal pure returns (bytes4[] memory res) {
        res = new bytes4[](3);
        res[0] = XChain.postEntitlementCheckResult.selector;
        res[1] = XChain.isCheckCompleted.selector;
        res[2] = XChain.provideXChainRefund.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function makeInitData() internal pure returns (bytes memory) {
        return abi.encodeCall(XChain.__XChain_init, ());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("XChain.sol", "");
    }
}
