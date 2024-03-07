// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// helpers
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

// contracts
import {IStreamRegistry} from "contracts/src/river/registry/facets/stream/IStreamRegistry.sol";

contract StreamRegistryHelper is FacetHelper {
  constructor() {
    bytes4[] memory selectors_ = new bytes4[](8);
    selectors_[_index++] = IStreamRegistry.allocateStream.selector;
    selectors_[_index++] = IStreamRegistry.getStream.selector;
    selectors_[_index++] = IStreamRegistry.getStreamWithGenesis.selector;
    selectors_[_index++] = IStreamRegistry.setStreamLastMiniblock.selector;
    selectors_[_index++] = IStreamRegistry.placeStreamOnNode.selector;
    selectors_[_index++] = IStreamRegistry.getStreamCount.selector;
    selectors_[_index++] = IStreamRegistry.getAllStreamIds.selector;
    selectors_[_index++] = IStreamRegistry.getAllStreams.selector;

    addSelectors(selectors_);
  }

  function facet() public pure override returns (address) {
    return address(0);
  }

  function selectors() public view override returns (bytes4[] memory) {
    return functionSelectors;
  }

  function initializer() public pure override returns (bytes4) {
    return "";
  }
}
