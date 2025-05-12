// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";
import {IStreamRegistry} from "src/river/registry/facets/stream/IStreamRegistry.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

// contracts

library DeployStreamRegistry {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(14);
        arr.p(IStreamRegistry.allocateStream.selector);
        arr.p(IStreamRegistry.addStream.selector);
        arr.p(IStreamRegistry.getStream.selector);
        arr.p(IStreamRegistry.getStreamWithGenesis.selector);
        arr.p(IStreamRegistry.setStreamLastMiniblockBatch.selector);
        arr.p(IStreamRegistry.placeStreamOnNode.selector);
        arr.p(IStreamRegistry.removeStreamFromNode.selector);
        arr.p(IStreamRegistry.setStreamReplicationFactor.selector);
        arr.p(IStreamRegistry.getStreamCount.selector);
        arr.p(IStreamRegistry.getPaginatedStreams.selector);
        arr.p(IStreamRegistry.isStream.selector);
        arr.p(IStreamRegistry.getStreamCountOnNode.selector);
        arr.p(IStreamRegistry.getPaginatedStreamsOnNode.selector);
        arr.p(IStreamRegistry.syncNodesOnStreams.selector);

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
        return LibDeploy.deployCode("StreamRegistry.sol", "");
    }
}
