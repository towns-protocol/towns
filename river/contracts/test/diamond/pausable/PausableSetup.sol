// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

// libraries

// contracts
import {FacetHelper, FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {PausableFacet} from "contracts/src/diamond/facets/pausable/PausableFacet.sol";
import {OwnableHelper} from "contracts/test/diamond/ownable/OwnableSetup.sol";

import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

abstract contract PausableSetup is FacetTest {
  PausableFacet internal pausable;

  function setUp() public override {
    super.setUp();
    pausable = PausableFacet(diamond);

    vm.startPrank(deployer);
  }

  function diamondInitParams()
    public
    override
    returns (Diamond.InitParams memory)
  {
    PausableHelper pausableHelper = new PausableHelper();
    OwnableHelper ownableHelper = new OwnableHelper();
    MultiInit multiInit = new MultiInit();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](2);
    cuts[0] = pausableHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[1] = ownableHelper.makeCut(IDiamond.FacetCutAction.Add);

    address[] memory initAddresses = new address[](2);
    initAddresses[0] = pausableHelper.facet();
    initAddresses[1] = ownableHelper.facet();

    bytes[] memory initDatas = new bytes[](2);
    initDatas[0] = pausableHelper.makeInitData("");
    initDatas[1] = ownableHelper.makeInitData(deployer);

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

contract PausableHelper is FacetHelper {
  PausableFacet internal pausable;

  constructor() {
    pausable = new PausableFacet();
  }

  function facet() public view override returns (address) {
    return address(pausable);
  }

  function selectors() public view override returns (bytes4[] memory) {
    bytes4[] memory selectors_ = new bytes4[](3);
    selectors_[0] = pausable.pause.selector;
    selectors_[1] = pausable.unpause.selector;
    selectors_[2] = pausable.paused.selector;
    return selectors_;
  }

  function initializer() public pure override returns (bytes4) {
    return PausableFacet.__Pausable_init.selector;
  }
}
