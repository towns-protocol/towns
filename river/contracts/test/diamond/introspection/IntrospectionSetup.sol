// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

// libraries

// contracts
import {FacetHelper, FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {IntrospectionFacet} from "contracts/src/diamond/facets/introspection/IntrospectionFacet.sol";

contract IntrospectionSetup is FacetTest {
  IntrospectionFacet internal introspection;

  function setUp() public override {
    super.setUp();
    introspection = IntrospectionFacet(diamond);
  }

  function diamondInitParams()
    public
    override
    returns (Diamond.InitParams memory)
  {
    IntrospectionHelper introspectionHelper = new IntrospectionHelper();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
    cuts[0] = introspectionHelper.makeCut(IDiamond.FacetCutAction.Add);

    return
      Diamond.InitParams({
        baseFacets: cuts,
        init: introspectionHelper.facet(),
        initData: introspectionHelper.makeInitData("")
      });
  }
}

contract IntrospectionHelper is FacetHelper {
  IntrospectionFacet internal introspection;

  constructor() {
    introspection = new IntrospectionFacet();
  }

  function facet() public view override returns (address) {
    return address(introspection);
  }

  function selectors() public view override returns (bytes4[] memory) {
    bytes4[] memory selectors_ = new bytes4[](1);
    selectors_[0] = introspection.supportsInterface.selector;
    return selectors_;
  }

  function initializer() public pure override returns (bytes4) {
    return IntrospectionFacet.__Introspection_init.selector;
  }
}
