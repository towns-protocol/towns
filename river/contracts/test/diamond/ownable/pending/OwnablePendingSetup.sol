// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

// libraries

// helpers
import {FacetHelper, FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {OwnablePendingFacet} from "contracts/src/diamond/facets/ownable/pending/OwnablePendingFacet.sol";

abstract contract OwnablePendingSetup is FacetTest {
  OwnablePendingFacet internal ownable;

  function setUp() public override {
    super.setUp();
    ownable = OwnablePendingFacet(diamond);
  }

  function diamondInitParams()
    public
    override
    returns (Diamond.InitParams memory)
  {
    OwnablePendingHelper ownableHelper = new OwnablePendingHelper();

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

contract OwnablePendingHelper is FacetHelper {
  OwnablePendingFacet internal ownablePending;

  constructor() {
    ownablePending = new OwnablePendingFacet();
  }

  function facet() public view override returns (address) {
    return address(ownablePending);
  }

  function selectors() public view override returns (bytes4[] memory) {
    bytes4[] memory selectors_ = new bytes4[](4);
    selectors_[0] = ownablePending.pendingOwner.selector;
    selectors_[1] = ownablePending.acceptOwnership.selector;
    selectors_[2] = ownablePending.transferOwnership.selector;
    selectors_[3] = ownablePending.owner.selector;
    return selectors_;
  }

  function initializer() public pure override returns (bytes4) {
    return OwnablePendingFacet.__OwnablePending_init.selector;
  }

  function makeInitData(address owner) public pure returns (bytes memory) {
    return abi.encodeWithSelector(initializer(), owner);
  }
}
