// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// helpers
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

// contracts
import {INodeRegistry} from "contracts/src/river/registry/facets/node/INodeRegistry.sol";

contract NodeRegistryHelper is FacetHelper {
  constructor() {
    bytes4[] memory selectors_ = new bytes4[](8);
    selectors_[_index++] = INodeRegistry.registerNode.selector;
    selectors_[_index++] = INodeRegistry.removeNode.selector;
    selectors_[_index++] = INodeRegistry.updateNodeStatus.selector;
    selectors_[_index++] = INodeRegistry.updateNodeUrl.selector;
    selectors_[_index++] = INodeRegistry.getNode.selector;
    selectors_[_index++] = INodeRegistry.getNodeCount.selector;
    selectors_[_index++] = INodeRegistry.getAllNodeAddresses.selector;
    selectors_[_index++] = INodeRegistry.getAllNodes.selector;
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
