// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {MembershipReferralFacet} from "contracts/src/spaces/facets/membership/referral/MembershipReferralFacet.sol";

contract DeployMembershipReferral is FacetHelper, Deployer {
  constructor() {
    addSelector(MembershipReferralFacet.createReferralCode.selector);
    addSelector(MembershipReferralFacet.createReferralCodeWithTime.selector);
    addSelector(MembershipReferralFacet.removeReferralCode.selector);
    addSelector(MembershipReferralFacet.referralCodeBps.selector);
    addSelector(MembershipReferralFacet.referralCodeTime.selector);
    addSelector(MembershipReferralFacet.calculateReferralAmount.selector);
  }

  function versionName() public pure override returns (string memory) {
    return "membershipReferralFacet";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    MembershipReferralFacet facet = new MembershipReferralFacet();
    vm.stopBroadcast();
    return address(facet);
  }

  function initializer() public pure override returns (bytes4) {
    return MembershipReferralFacet.__MembershipReferralFacet_init.selector;
  }
}
