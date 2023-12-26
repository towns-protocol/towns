// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IPlatformRequirements} from "contracts/src/towns/facets/platform/requirements/IPlatformRequirements.sol";

// libraries

// contracts
import {FacetHelper, FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {PlatformRequirementsFacet} from "contracts/src/towns/facets/platform/requirements/PlatformRequirementsFacet.sol";

// helpers
import {OwnableHelper} from "contracts/test/diamond/ownable/OwnableSetup.sol";
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

abstract contract PlatformRequirementsSetup is FacetTest {
  PlatformRequirementsFacet internal platformReqs;

  function setUp() public override {
    super.setUp();
    platformReqs = PlatformRequirementsFacet(diamond);
  }

  function diamondInitParams()
    public
    override
    returns (Diamond.InitParams memory)
  {
    OwnableHelper ownableHelper = new OwnableHelper();
    PlatformRequirementsHelper platformReqsHelper = new PlatformRequirementsHelper();

    address feeRecipient = address(deployer);
    uint16 membershipBps = 0;
    uint256 membershipFee = 0;
    uint256 membershipMintLimit = 1_000;
    uint64 membershipDuration = 365 days;

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](2);
    uint256 index;

    cuts[index++] = ownableHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[index++] = platformReqsHelper.makeCut(IDiamond.FacetCutAction.Add);

    address[] memory initAddresses = new address[](2);
    bytes[] memory initDatas = new bytes[](2);

    initAddresses[0] = ownableHelper.facet();
    initAddresses[1] = platformReqsHelper.facet();

    initDatas[0] = ownableHelper.makeInitData(deployer);
    initDatas[1] = abi.encodeWithSelector(
      platformReqsHelper.initializer(),
      feeRecipient,
      membershipBps,
      membershipFee,
      membershipMintLimit,
      membershipDuration
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

contract PlatformRequirementsHelper is FacetHelper {
  PlatformRequirementsFacet internal platformReqs;

  constructor() {
    platformReqs = new PlatformRequirementsFacet();
  }

  function facet() public view override returns (address) {
    return address(platformReqs);
  }

  function selectors() public pure override returns (bytes4[] memory) {
    bytes4[] memory selectors_ = new bytes4[](11);
    uint256 index;

    selectors_[index++] = IPlatformRequirements.setFeeRecipient.selector;
    selectors_[index++] = IPlatformRequirements.getFeeRecipient.selector;
    selectors_[index++] = IPlatformRequirements.setMembershipBps.selector;
    selectors_[index++] = IPlatformRequirements.getMembershipBps.selector;
    selectors_[index++] = IPlatformRequirements.setMembershipFee.selector;
    selectors_[index++] = IPlatformRequirements.getMembershipFee.selector;
    selectors_[index++] = IPlatformRequirements.setMembershipMintLimit.selector;
    selectors_[index++] = IPlatformRequirements.getMembershipMintLimit.selector;
    selectors_[index++] = IPlatformRequirements.setMembershipDuration.selector;
    selectors_[index++] = IPlatformRequirements.getMembershipDuration.selector;
    selectors_[index++] = IPlatformRequirements.getDenominator.selector;

    return selectors_;
  }

  function initializer() public pure override returns (bytes4) {
    return PlatformRequirementsFacet.__PlatformRequirements_init.selector;
  }

  function makeInitData(
    address feeRecipient,
    uint16 membershipBps,
    uint256 membershipFee,
    uint256 membershipMintLimit,
    uint64 membershipDuration
  ) public pure returns (bytes memory) {
    return
      abi.encodeWithSelector(
        PlatformRequirementsFacet.__PlatformRequirements_init.selector,
        feeRecipient,
        membershipBps,
        membershipFee,
        membershipMintLimit,
        membershipDuration
      );
  }
}
