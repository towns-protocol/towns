// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

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

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    NodeRegistry facet = new NodeRegistry();
    vm.stopBroadcast();
    return address(facet);
  }
}
