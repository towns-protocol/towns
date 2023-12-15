// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

// libraries

// helpers
import {FacetHelper, FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {TokenOwnableHelper} from "contracts/test/diamond/ownable/token/TokenOwnableSetup.sol";
import {MockERC721A} from "contracts/test/mocks/MockERC721A.sol";
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

// contracts
import {MembershipReferralFacet} from "contracts/src/towns/facets/membership/referral/MembershipReferralFacet.sol";

abstract contract MembershipReferralSetup is FacetTest {
  MembershipReferralFacet internal referrals;
  address townOwner;

  function setUp() public override {
    super.setUp();
    referrals = MembershipReferralFacet(address(diamond));
  }

  function diamondInitParams()
    public
    override
    returns (Diamond.InitParams memory)
  {
    TokenOwnableHelper tokenOwnableHelper = new TokenOwnableHelper();
    MembershipReferralHelper membershipReferralHelper = new MembershipReferralHelper();
    MockERC721A mockERC721A = new MockERC721A();
    MultiInit multiInit = new MultiInit();

    townOwner = _randomAddress();
    uint256 tokenId = mockERC721A.mintTo(townOwner);

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](2);

    cuts[0] = tokenOwnableHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[1] = membershipReferralHelper.makeCut(IDiamond.FacetCutAction.Add);

    address[] memory addresses = new address[](2);
    addresses[0] = tokenOwnableHelper.facet();
    addresses[1] = membershipReferralHelper.facet();

    bytes[] memory datas = new bytes[](2);
    datas[0] = tokenOwnableHelper.makeInitData(address(mockERC721A), tokenId);
    datas[1] = membershipReferralHelper.makeInitData("");

    return
      Diamond.InitParams({
        baseFacets: cuts,
        init: address(multiInit),
        initData: abi.encodeWithSelector(
          multiInit.multiInit.selector,
          addresses,
          datas
        )
      });
  }
}

contract MembershipReferralHelper is FacetHelper {
  MembershipReferralFacet internal membershipReferral;

  constructor() {
    membershipReferral = new MembershipReferralFacet();

    uint256 index;
    bytes4[] memory selectors_ = new bytes4[](6);

    selectors_[index++] = membershipReferral.createReferralCode.selector;
    selectors_[index++] = membershipReferral
      .createReferralCodeWithTime
      .selector;
    selectors_[index++] = membershipReferral.removeReferralCode.selector;
    selectors_[index++] = membershipReferral.referralCodeBps.selector;
    selectors_[index++] = membershipReferral.calculateReferralAmount.selector;
    selectors_[index++] = membershipReferral.referralCodeTime.selector;

    addSelectors(selectors_);
  }

  function facet() public view override returns (address) {
    return address(membershipReferral);
  }

  function initializer() public view override returns (bytes4) {
    return membershipReferral.__MembershipReferralFacet_init.selector;
  }

  function selectors() public view override returns (bytes4[] memory) {
    return functionSelectors;
  }
}
