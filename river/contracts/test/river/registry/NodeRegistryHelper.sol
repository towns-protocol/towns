// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// interfaces

// libraries

// helpers
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

// contracts
import {INodeRegistry} from "contracts/src/river/registry/facets/node/INodeRegistry.sol";

contract NodeRegistryHelper is FacetHelper {
  constructor() {
    addSelector(INodeRegistry.registerNode.selector);
    addSelector(INodeRegistry.removeNode.selector);
    addSelector(INodeRegistry.updateNodeStatus.selector);
    addSelector(INodeRegistry.updateNodeUrl.selector);
    addSelector(INodeRegistry.getNode.selector);
    addSelector(INodeRegistry.getNodeCount.selector);
    addSelector(INodeRegistry.getAllNodeAddresses.selector);
    addSelector(INodeRegistry.getAllNodes.selector);
  }
}
