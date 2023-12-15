// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

//interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";

//libraries

//contracts
import {Migration} from "../common/Migration.s.sol";

// facets
import {MembershipFacet} from "contracts/src/towns/facets/membership/MembershipFacet.sol";
import {MembershipReferralFacet} from "contracts/src/towns/facets/membership/referral/MembershipReferralFacet.sol";

// helpers
import {ERC721AHelper} from "contracts/test/diamond/erc721a/ERC721ASetup.sol";
import {MembershipHelper} from "contracts/test/towns/membership/MembershipSetup.sol";
import {MembershipReferralHelper} from "contracts/test/towns/membership/MembershipReferralSetup.sol";

contract MigrateMembership is Migration {
  ERC721AHelper erc721aHelper = new ERC721AHelper();
  MembershipHelper membershipHelper = new MembershipHelper();
  MembershipReferralHelper membershipReferralHelper =
    new MembershipReferralHelper();

  function __migration(uint256 deployerPK, address) public override {
    address diamond = getDeployment("town");
    uint256 index = 0;

    vm.startBroadcast(deployerPK);
    address membership = address(new MembershipFacet());
    address membershipReferral = address(new MembershipReferralFacet());
    vm.stopBroadcast();

    membershipHelper.addSelectors(erc721aHelper.selectors());

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](3);

    // Replace the membership facet
    cuts[index++] = IDiamond.FacetCut({
      facetAddress: membership,
      action: IDiamond.FacetCutAction.Replace,
      functionSelectors: membershipHelper.selectors()
    });

    // Add the membership referral facet's new selector
    bytes4[] memory newReferralSelectors = new bytes4[](3);
    newReferralSelectors[0] = MembershipReferralFacet
      .calculateReferralAmount
      .selector;
    newReferralSelectors[1] = MembershipReferralFacet
      .createReferralCodeWithTime
      .selector;
    newReferralSelectors[2] = MembershipReferralFacet.referralCodeTime.selector;

    cuts[index++] = IDiamond.FacetCut({
      facetAddress: membershipReferral,
      action: IDiamond.FacetCutAction.Add,
      functionSelectors: newReferralSelectors
    });

    // Replace the membership referral facet with the new one
    membershipReferralHelper.removeSelector(
      MembershipReferralFacet.calculateReferralAmount.selector
    );
    membershipReferralHelper.removeSelector(
      MembershipReferralFacet.createReferralCodeWithTime.selector
    );
    membershipReferralHelper.removeSelector(
      MembershipReferralFacet.referralCodeTime.selector
    );

    cuts[index++] = IDiamond.FacetCut({
      facetAddress: membershipReferral,
      action: IDiamond.FacetCutAction.Replace,
      functionSelectors: membershipReferralHelper.selectors()
    });

    vm.startBroadcast(deployerPK);
    IDiamondCut(diamond).diamondCut(cuts, address(0), "");
    vm.stopBroadcast();
  }
}
