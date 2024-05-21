// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

// libraries

// contracts
import {FacetHelper, FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {OwnableFacet} from "contracts/src/diamond/facets/ownable/OwnableFacet.sol";
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

abstract contract OwnableSetup is FacetTest {
  MultiInit internal multiInit;
  OwnableHelper internal ownableHelper;
  OwnableFacet internal ownable;

  function setUp() public override {
    super.setUp();
    ownable = OwnableFacet(diamond);

    vm.startPrank(deployer);
  }

  function diamondInitParams()
    public
    override
    returns (Diamond.InitParams memory)
  {
    ownableHelper = new OwnableHelper();
    multiInit = new MultiInit();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
    cuts[0] = ownableHelper.makeCut(IDiamond.FacetCutAction.Add);

    return
      Diamond.InitParams({
        baseFacets: cuts,
        init: ownableHelper.facet(),
        initData: ownableHelper.makeInitData(deployer)
      });
  }
}

contract OwnableHelper is FacetHelper {
  OwnableFacet internal ownable;

  constructor() {
    ownable = new OwnableFacet();
  }

  function facet() public view override returns (address) {
    return address(ownable);
  }

  function selectors() public view override returns (bytes4[] memory) {
    bytes4[] memory selectors_ = new bytes4[](2);
    selectors_[0] = ownable.owner.selector;
    selectors_[1] = ownable.transferOwnership.selector;
    return selectors_;
  }

  function initializer() public pure override returns (bytes4) {
    return OwnableFacet.__Ownable_init.selector;
  }

  function makeInitData(address owner) public pure returns (bytes memory) {
    return abi.encodeWithSelector(OwnableFacet.__Ownable_init.selector, owner);
  }
}
