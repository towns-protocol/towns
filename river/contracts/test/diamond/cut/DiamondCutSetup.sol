// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

// libraries

// contracts
import {FacetHelper, FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {DiamondCutFacet} from "contracts/src/diamond/facets/cut/DiamondCutFacet.sol";

// helpers
import {OwnableHelper} from "contracts/test/diamond/ownable/OwnableSetup.sol";
import {DiamondLoupeHelper} from "contracts/test/diamond/loupe/DiamondLoupeSetup.sol";
import {IntrospectionHelper} from "contracts/test/diamond/introspection/IntrospectionSetup.sol";

// mocks
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";
import {MockFacet} from "contracts/test/mocks/MockFacet.sol";

abstract contract DiamondCutSetup is FacetTest {
  DiamondCutFacet internal diamondCut;
  MockFacet internal mockFacet;

  function setUp() public override {
    super.setUp();
    diamondCut = DiamondCutFacet(diamond);
    mockFacet = new MockFacet();

    vm.startPrank(deployer);
  }

  function diamondInitParams()
    public
    override
    returns (Diamond.InitParams memory)
  {
    DiamondCutHelper diamondCutHelper = new DiamondCutHelper();
    OwnableHelper ownableHelper = new OwnableHelper();
    DiamondLoupeHelper diamondLoupeHelper = new DiamondLoupeHelper();
    IntrospectionHelper introspectionHelper = new IntrospectionHelper();

    uint256 selectorCount = 4;

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](selectorCount);
    cuts[0] = diamondCutHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[1] = ownableHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[2] = diamondLoupeHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[3] = introspectionHelper.makeCut(IDiamond.FacetCutAction.Add);

    address[] memory initAddresses = new address[](selectorCount);
    bytes[] memory initDatas = new bytes[](selectorCount);

    initAddresses[0] = diamondCutHelper.facet();
    initAddresses[1] = ownableHelper.facet();
    initAddresses[2] = diamondLoupeHelper.facet();
    initAddresses[3] = introspectionHelper.facet();

    initDatas[0] = diamondCutHelper.makeInitData("");
    initDatas[1] = ownableHelper.makeInitData(deployer);
    initDatas[2] = diamondLoupeHelper.makeInitData("");
    initDatas[3] = introspectionHelper.makeInitData("");

    MultiInit multiInit = new MultiInit();

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

contract DiamondCutHelper is FacetHelper {
  DiamondCutFacet internal diamondCut;

  constructor() {
    diamondCut = new DiamondCutFacet();
    addSelector(diamondCut.diamondCut.selector);
  }

  function facet() public view override returns (address) {
    return address(diamondCut);
  }

  function selectors() public view override returns (bytes4[] memory) {
    return functionSelectors;
  }

  function initializer() public pure override returns (bytes4) {
    return DiamondCutFacet.__DiamondCut_init.selector;
  }
}
