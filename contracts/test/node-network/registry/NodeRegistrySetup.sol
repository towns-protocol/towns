// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

// libraries

// contracts
import {FacetHelper, FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {NodeRegistryFacet, INodeRegistry} from "contracts/src/node-network/registry/NodeRegistryFacet.sol";

abstract contract NodeRegistrySetup is FacetTest {
  NodeRegistryFacet internal nodeRegistryFacet;

  function setUp() public override {
    super.setUp();

    vm.prank(deployer);
    nodeRegistryFacet = NodeRegistryFacet(diamond);
    vm.stopPrank();
  }

  function diamondInitParams()
    public
    override
    returns (Diamond.InitParams memory)
  {
    NodeRegistryHelper facetHelper = new NodeRegistryHelper();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
    cuts[0] = facetHelper.makeCut(IDiamond.FacetCutAction.Add);

    return
      Diamond.InitParams({baseFacets: cuts, init: address(0), initData: ""});
  }
}

contract NodeRegistryHelper is FacetHelper {
  NodeRegistryFacet internal nodeRegistry;

  constructor() {
    nodeRegistry = new NodeRegistryFacet();
  }

  function facet() public view override returns (address) {
    return address(nodeRegistry);
  }

  function selectors() public pure override returns (bytes4[] memory) {
    bytes4[] memory selector_ = new bytes4[](4);
    selector_[0] = INodeRegistry.registerNode.selector;
    selector_[1] = INodeRegistry.getNode.selector;
    selector_[2] = INodeRegistry.updateNode.selector;
    selector_[3] = INodeRegistry.getRegisterNodeDigest.selector;
    return selector_;
  }

  function initializer() public pure override returns (bytes4) {
    return "";
  }
}
