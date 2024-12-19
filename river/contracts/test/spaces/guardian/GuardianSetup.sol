// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond, Diamond} from "@river-build/diamond/src/Diamond.sol";

// libraries

// helpers
import {FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {GuardianFacet} from "contracts/src/spaces/facets/guardian/GuardianFacet.sol";
import {MultiInit} from "@river-build/diamond/src/initializers/MultiInit.sol";
import {DeployGuardianFacet} from "contracts/scripts/deployments/facets/DeployGuardianFacet.s.sol";

abstract contract GuardianSetup is FacetTest {
  DeployGuardianFacet internal guardianHelper = new DeployGuardianFacet();
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
    MultiInit multiInit = new MultiInit();

    address guardianFacet = guardianHelper.deploy(deployer);

    addFacet(
      guardianHelper.makeCut(guardianFacet, IDiamond.FacetCutAction.Add),
      guardianFacet,
      guardianHelper.makeInitData(7 days)
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
