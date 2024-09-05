// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {ReferralsFacet} from "contracts/src/spaces/facets/referrals/ReferralsFacet.sol";

contract DeployReferrals is Deployer, FacetHelper {
  constructor() {
    addSelector(ReferralsFacet.registerReferral.selector);
    addSelector(ReferralsFacet.referralInfo.selector);
    addSelector(ReferralsFacet.updateReferral.selector);
    addSelector(ReferralsFacet.removeReferral.selector);
    addSelector(ReferralsFacet.setMaxBpsFee.selector);
    addSelector(ReferralsFacet.maxBpsFee.selector);
    addSelector(ReferralsFacet.setDefaultBpsFee.selector);
    addSelector(ReferralsFacet.defaultBpsFee.selector);
  }

  function versionName() public pure override returns (string memory) {
    return "referralsFacet";
  }

  function initializer() public pure override returns (bytes4) {
    return ReferralsFacet.__ReferralsFacet_init.selector;
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    ReferralsFacet facet = new ReferralsFacet();
    vm.stopBroadcast();
    return address(facet);
  }
}
