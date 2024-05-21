// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

// libraries

// helpers
import {FacetHelper, FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {GuardianFacet} from "contracts/src/spaces/facets/guardian/GuardianFacet.sol";

abstract contract GuardianSetup is FacetTest {
  GuardianFacet internal guardian;

  function setUp() public override {
    super.setUp();
    guardian = GuardianFacet(diamond);
  }

  function diamondInitParams()
    public
    virtual
    override
    returns (Diamond.InitParams memory)
  {
    GuardianHelper guardianHelper = new GuardianHelper();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
    cuts[0] = guardianHelper.makeCut(IDiamond.FacetCutAction.Add);

    return
      Diamond.InitParams({
        baseFacets: cuts,
        init: guardianHelper.facet(),
        initData: guardianHelper.makeInitData(7 days)
      });
  }
}

contract GuardianHelper is FacetHelper {
  GuardianFacet internal guardian;

  constructor() {
    guardian = new GuardianFacet();

    bytes4[] memory _selectors = new bytes4[](4);
    uint256 index;

    _selectors[index++] = guardian.enableGuardian.selector;
    _selectors[index++] = guardian.guardianCooldown.selector;
    _selectors[index++] = guardian.disableGuardian.selector;
    _selectors[index++] = guardian.isGuardianEnabled.selector;

    addSelectors(_selectors);
  }

  function facet() public view override returns (address) {
    return address(guardian);
  }

  function initializer() public view override returns (bytes4) {
    return guardian.__GuardianFacet_init.selector;
  }

  function selectors()
    public
    view
    override
    returns (bytes4[] memory selectors_)
  {
    return functionSelectors;
  }

  function makeInitData(uint256 cooldown) public view returns (bytes memory) {
    return abi.encodeWithSelector(initializer(), cooldown);
  }
}
