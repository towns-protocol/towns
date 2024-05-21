// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// interfaces

// libraries

// helpers
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

// contracts
import {IStreamRegistry} from "contracts/src/river/registry/facets/stream/IStreamRegistry.sol";

contract StreamRegistryHelper is FacetHelper {
  constructor() {
    addSelector(IStreamRegistry.allocateStream.selector);
    addSelector(IStreamRegistry.getPaginatedStreams.selector);
    addSelector(IStreamRegistry.getStream.selector);
    addSelector(IStreamRegistry.getStreamByIndex.selector);
    addSelector(IStreamRegistry.getStreamWithGenesis.selector);
    addSelector(IStreamRegistry.setStreamLastMiniblock.selector);
    addSelector(IStreamRegistry.setStreamLastMiniblockBatch.selector);
    addSelector(IStreamRegistry.placeStreamOnNode.selector);
    addSelector(IStreamRegistry.getStreamCount.selector);
    addSelector(IStreamRegistry.getAllStreamIds.selector);
    addSelector(IStreamRegistry.getAllStreams.selector);
  }
}
