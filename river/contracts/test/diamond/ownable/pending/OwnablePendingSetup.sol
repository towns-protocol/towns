// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

// libraries

// helpers
import {FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {OwnablePendingFacet} from "contracts/src/diamond/facets/ownable/pending/OwnablePendingFacet.sol";
import {DeployOwnablePendingFacet} from "contracts/scripts/deployments/facets/DeployOwnablePendingFacet.s.sol";

import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

abstract contract OwnablePendingSetup is FacetTest {
  DeployOwnablePendingFacet internal ownableHelper =
    new DeployOwnablePendingFacet();

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
    MultiInit multiInit = new MultiInit();

    address ownablePending = ownableHelper.deploy();

    addFacet(
      ownableHelper.makeCut(ownablePending, IDiamond.FacetCutAction.Add),
      ownablePending,
      ownableHelper.makeInitData(deployer)
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
