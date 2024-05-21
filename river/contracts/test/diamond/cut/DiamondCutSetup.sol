// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

// libraries

// contracts
import {FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {DiamondCutFacet} from "contracts/src/diamond/facets/cut/DiamondCutFacet.sol";
import {DiamondLoupeFacet} from "contracts/src/diamond/facets/loupe/DiamondLoupeFacet.sol";

// helpers
import {DeployDiamondCut} from "contracts/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "contracts/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployIntrospection} from "contracts/scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployOwnable} from "contracts/scripts/deployments/facets/DeployOwnable.s.sol";

// mocks
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

abstract contract DiamondCutSetup is FacetTest {
  DeployDiamondCut cutHelper = new DeployDiamondCut();
  DeployDiamondLoupe loupeHelper = new DeployDiamondLoupe();
  DeployIntrospection introspectionHelper = new DeployIntrospection();
  DeployOwnable ownableHelper = new DeployOwnable();

  DiamondCutFacet internal diamondCut;
  DiamondLoupeFacet internal diamondLoupe;

  function setUp() public virtual override {
    super.setUp();

    diamondCut = DiamondCutFacet(diamond);
    diamondLoupe = DiamondLoupeFacet(diamond);
  }

  function diamondInitParams()
    public
    override
    returns (Diamond.InitParams memory)
  {
    MultiInit multiInit = new MultiInit();

    address cut = cutHelper.deploy();
    address loupe = loupeHelper.deploy();
    address introspection = introspectionHelper.deploy();
    address ownable = ownableHelper.deploy();

    addFacet(
      cutHelper.makeCut(cut, IDiamond.FacetCutAction.Add),
      cut,
      cutHelper.makeInitData("")
    );
    addFacet(
      ownableHelper.makeCut(ownable, IDiamond.FacetCutAction.Add),
      ownable,
      ownableHelper.makeInitData(deployer)
    );
    addFacet(
      loupeHelper.makeCut(loupe, IDiamond.FacetCutAction.Add),
      loupe,
      loupeHelper.makeInitData("")
    );
    addFacet(
      introspectionHelper.makeCut(introspection, IDiamond.FacetCutAction.Add),
      introspection,
      introspectionHelper.makeInitData("")
    );

    return
      Diamond.InitParams({
        baseFacets: baseFacets(),
        init: address(multiInit),
        initData: abi.encodeWithSelector(
          MultiInit.multiInit.selector,
          _initAddresses,
          _initDatas
        )
      });
  }
}
