// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

import {StreamRegistry} from "contracts/src/river/registry/facets/stream/StreamRegistry.sol";

contract DeployStreamRegistry is FacetHelper, Deployer {
  constructor() {
    addSelector(StreamRegistry.allocateStream.selector);
    addSelector(StreamRegistry.getStream.selector);
    addSelector(StreamRegistry.getStreamByIndex.selector);
    addSelector(StreamRegistry.getStreamWithGenesis.selector);
    addSelector(StreamRegistry.setStreamLastMiniblock.selector);
    addSelector(StreamRegistry.setStreamLastMiniblockBatch.selector);
    addSelector(StreamRegistry.placeStreamOnNode.selector);
    addSelector(StreamRegistry.removeStreamFromNode.selector);
    addSelector(StreamRegistry.getStreamCount.selector);
    addSelector(StreamRegistry.getAllStreamIds.selector);
    addSelector(StreamRegistry.getAllStreams.selector);
    addSelector(StreamRegistry.getPaginatedStreams.selector);
    addSelector(StreamRegistry.getStreamsOnNode.selector);
  }

  function versionName() public pure override returns (string memory) {
    return "streamRegistryFacet";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    StreamRegistry facet = new StreamRegistry();
    vm.stopBroadcast();
    return address(facet);
  }
}
