// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries
import "forge-std/console.sol";

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {IDiamond} from "contracts/src/diamond/Diamond.sol";

import {StreamRegistry} from "contracts/src/river/registry/facets/stream/StreamRegistry.sol";

contract DeployStreamRegistry is FacetHelper, Deployer {
  constructor() {
    addSelector(StreamRegistry.allocateStream.selector);
    addSelector(StreamRegistry.getStream.selector);
    addSelector(StreamRegistry.getStreams.selector);
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
    addSelector(StreamRegistry.getStreamCountOnNode.selector);
  }

  function versionName() public pure override returns (string memory) {
    return "streamRegistryFacet";
  }

  function facetInitHelper(
    address deployer,
    address facetAddress
  ) external override returns (FacetCut memory, bytes memory) {
    IDiamond.FacetCut memory facetCut = this.makeCut(
      facetAddress,
      IDiamond.FacetCutAction.Add
    );
    console.log("facetInitHelper: deployer", deployer);
    return (facetCut, "");
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    StreamRegistry facet = new StreamRegistry();
    vm.stopBroadcast();
    return address(facet);
  }
}
