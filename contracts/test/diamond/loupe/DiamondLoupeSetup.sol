// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

// libraries

// contracts
import {FacetHelper, FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {DiamondLoupeFacet} from "contracts/src/diamond/facets/loupe/DiamondLoupeFacet.sol";
import {DiamondCutFacet} from "contracts/src/diamond/facets/cut/DiamondCutFacet.sol";

// helpers
import {DiamondCutHelper} from "contracts/test/diamond/cut/DiamondCutSetup.sol";
import {IntrospectionHelper} from "contracts/test/diamond/introspection/IntrospectionSetup.sol";
import {OwnableHelper} from "contracts/test/diamond/ownable/OwnableSetup.sol";
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

abstract contract DiamondLoupeSetup is FacetTest {
  DiamondLoupeFacet internal diamondLoupe;
  DiamondCutFacet internal diamondCut;

  function setUp() public override {
    super.setUp();
    diamondLoupe = DiamondLoupeFacet(diamond);
    diamondCut = DiamondCutFacet(diamond);

    vm.startPrank(deployer);
  }

  function diamondInitParams()
    public
    override
    returns (Diamond.InitParams memory)
  {
    DiamondLoupeHelper diamondLoupeHelper = new DiamondLoupeHelper();
    DiamondCutHelper diamondCutHelper = new DiamondCutHelper();
    IntrospectionHelper introspectionHelper = new IntrospectionHelper();
    OwnableHelper ownableHelper = new OwnableHelper();
    MultiInit multiInit = new MultiInit();

    uint256 selectorCount = 4;
    uint256 selectorIndex;

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](selectorCount);
    cuts[selectorIndex++] = diamondLoupeHelper.makeCut(
      IDiamond.FacetCutAction.Add
    );
    cuts[selectorIndex++] = diamondCutHelper.makeCut(
      IDiamond.FacetCutAction.Add
    );
    cuts[selectorIndex++] = introspectionHelper.makeCut(
      IDiamond.FacetCutAction.Add
    );
    cuts[selectorIndex++] = ownableHelper.makeCut(IDiamond.FacetCutAction.Add);

    address[] memory initAddresses = new address[](selectorCount);
    bytes[] memory initDatas = new bytes[](selectorCount);

    initAddresses[0] = diamondLoupeHelper.facet();
    initAddresses[1] = diamondCutHelper.facet();
    initAddresses[2] = introspectionHelper.facet();
    initAddresses[3] = ownableHelper.facet();

    initDatas[0] = diamondLoupeHelper.makeInitData("");
    initDatas[1] = diamondCutHelper.makeInitData("");
    initDatas[2] = introspectionHelper.makeInitData("");
    initDatas[3] = ownableHelper.makeInitData(deployer);

    return
      Diamond.InitParams({
        baseFacets: cuts,
        init: address(multiInit),
        initData: abi.encodeWithSelector(
          multiInit.multiInit.selector,
          initAddresses,
          initDatas
        )
      });
  }
}

contract DiamondLoupeHelper is FacetHelper {
  DiamondLoupeFacet internal diamondLoupe;

  constructor() {
    diamondLoupe = new DiamondLoupeFacet();
  }

  function facet() public view override returns (address) {
    return address(diamondLoupe);
  }

  function selectors() public view override returns (bytes4[] memory) {
    bytes4[] memory selectors_ = new bytes4[](4);
    selectors_[0] = diamondLoupe.facets.selector;
    selectors_[1] = diamondLoupe.facetAddress.selector;
    selectors_[2] = diamondLoupe.facetFunctionSelectors.selector;
    selectors_[3] = diamondLoupe.facetAddresses.selector;

    return selectors_;
  }

  function initializer() public pure override returns (bytes4) {
    return DiamondLoupeFacet.__DiamondLoupe_init.selector;
  }
}
