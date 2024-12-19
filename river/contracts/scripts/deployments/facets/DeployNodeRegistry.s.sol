// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries
import "forge-std/console.sol";

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {IDiamond} from "@river-build/diamond/src/Diamond.sol";

import {NodeRegistry} from "contracts/src/river/registry/facets/node/NodeRegistry.sol";

contract DeployNodeRegistry is FacetHelper, Deployer {
  constructor() {
    addSelector(NodeRegistry.registerNode.selector);
    addSelector(NodeRegistry.removeNode.selector);
    addSelector(NodeRegistry.updateNodeStatus.selector);
    addSelector(NodeRegistry.updateNodeUrl.selector);
    addSelector(NodeRegistry.getNode.selector);
    addSelector(NodeRegistry.getNodeCount.selector);
    addSelector(NodeRegistry.getAllNodeAddresses.selector);
    addSelector(NodeRegistry.getAllNodes.selector);
  }

  function versionName() public pure override returns (string memory) {
    return "nodeRegistryFacet";
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
    NodeRegistry facet = new NodeRegistry();
    vm.stopBroadcast();
    return address(facet);
  }
}
