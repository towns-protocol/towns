// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {NodeRegistryFacet, INodeRegistry} from "contracts/src/node/registry/NodeRegistryFacet.sol";

contract NodeRegistryHelper is FacetHelper {
  NodeRegistryFacet internal nodeRegistry;

  constructor() {
    nodeRegistry = new NodeRegistryFacet();

    bytes4[] memory selector_ = new bytes4[](4);
    selector_[0] = INodeRegistry.registerNode.selector;
    selector_[1] = INodeRegistry.getNode.selector;
    selector_[2] = INodeRegistry.updateNode.selector;
    selector_[3] = INodeRegistry.getRegisterNodeDigest.selector;
    addSelectors(selector_);
  }

  function facet() public view override returns (address) {
    return address(nodeRegistry);
  }

  function selectors() public view override returns (bytes4[] memory) {
    return functionSelectors;
  }

  function initializer() public pure override returns (bytes4) {
    return NodeRegistryFacet.__NodeRegistry_init.selector;
  }
}
