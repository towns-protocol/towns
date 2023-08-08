// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

// libraries

// contracts
import {FacetHelper, FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {PlatformFeeFacet} from "contracts/src/towns/facets/platform/fee/PlatformFeeFacet.sol";

// helpers
import {OwnableHelper} from "contracts/test/diamond/ownable/OwnableSetup.sol";
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

abstract contract PlatformFeeSetup is FacetTest {
  PlatformFeeFacet internal platformFee;

  function setUp() public override {
    super.setUp();

    vm.prank(deployer);
    platformFee = PlatformFeeFacet(diamond);
  }

  function diamondInitParams()
    public
    override
    returns (Diamond.InitParams memory)
  {
    OwnableHelper ownableHelper = new OwnableHelper();
    PlatformFeeHelper platformFeeHelper = new PlatformFeeHelper();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](2);
    uint256 index;

    cuts[index++] = ownableHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[index++] = platformFeeHelper.makeCut(IDiamond.FacetCutAction.Add);

    address[] memory initAddresses = new address[](2);
    bytes[] memory initDatas = new bytes[](2);

    initAddresses[0] = ownableHelper.facet();
    initAddresses[1] = platformFeeHelper.facet();

    initDatas[0] = ownableHelper.makeInitData(abi.encode(deployer));
    initDatas[1] = abi.encodeWithSelector(
      platformFeeHelper.initializer(),
      address(deployer),
      0,
      0
    );

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

contract PlatformFeeHelper is FacetHelper {
  PlatformFeeFacet internal platformFee;

  constructor() {
    platformFee = new PlatformFeeFacet();
  }

  function facet() public view override returns (address) {
    return address(platformFee);
  }

  function selectors() public pure override returns (bytes4[] memory) {
    bytes4[] memory selectors_ = new bytes4[](4);
    selectors_[0] = PlatformFeeFacet.getPlatformFee.selector;
    selectors_[1] = PlatformFeeFacet.getPlatformDenominator.selector;
    selectors_[2] = PlatformFeeFacet.setPlatformFeeRecipient.selector;
    selectors_[3] = PlatformFeeFacet.setPlatformFee.selector;
    return selectors_;
  }

  function initializer() public pure override returns (bytes4) {
    return PlatformFeeFacet.__PlatformFee_init.selector;
  }
}
