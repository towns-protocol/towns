// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

// contracts
import {ReputationRegistryFacet} from "src/apps/facets/reputation/ReputationRegistryFacet.sol";

library DeployReputationRegistry {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        uint256 selectorsCount = 10;
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(selectorsCount);
        arr.p(ReputationRegistryFacet.giveFeedback.selector);
        arr.p(ReputationRegistryFacet.revokeFeedback.selector);
        arr.p(ReputationRegistryFacet.appendResponse.selector);
        arr.p(ReputationRegistryFacet.getIdentityRegistry.selector);
        arr.p(ReputationRegistryFacet.getSummary.selector);
        arr.p(ReputationRegistryFacet.readFeedback.selector);
        arr.p(ReputationRegistryFacet.readAllFeedback.selector);
        arr.p(ReputationRegistryFacet.getResponseCount.selector);
        arr.p(ReputationRegistryFacet.getClients.selector);
        arr.p(ReputationRegistryFacet.getLastIndex.selector);

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

    function makeInitData(
        string memory feedbackSchema,
        string memory responseSchema
    ) internal pure returns (bytes memory) {
        return
            abi.encodeCall(
                ReputationRegistryFacet.__ReputationRegistry_init,
                (feedbackSchema, responseSchema)
            );
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("ReputationRegistryFacet.sol", "");
    }
}
