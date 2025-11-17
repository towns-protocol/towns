// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts
import {AppTreasuryFacet} from "src/spaces/facets/account/treasury/AppTreasuryFacet.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

library DeployAppTreasury {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(5);
        arr.p(AppTreasuryFacet.fundsRequest.selector);
        arr.p(AppTreasuryFacet.configureStream.selector);
        arr.p(AppTreasuryFacet.pauseStream.selector);
        arr.p(AppTreasuryFacet.resumeStream.selector);
        arr.p(AppTreasuryFacet.getStreamBalance.selector);
        bytes32[] memory selectors_ = arr.asBytes32Array();
        assembly ("memory-safe") {
            res := selectors_
        }
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return
            IDiamond.FacetCut({
                action: action,
                facetAddress: facetAddress,
                functionSelectors: selectors()
            });
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("AppTreasuryFacet.sol", "");
    }
}
