// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

//interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";

//contracts
import {Migration} from "../common/Migration.s.sol";

// facets
import {MembershipFacet} from "contracts/src/towns/facets/membership/MembershipFacet.sol";

// helpers
import {ERC721AHelper} from "contracts/test/diamond/erc721a/ERC721ASetup.sol";
import {MembershipHelper} from "contracts/test/towns/membership/MembershipHelper.sol";

contract MigrateMembership is Migration {
  ERC721AHelper erc721aHelper = new ERC721AHelper();
  MembershipHelper membershipHelper = new MembershipHelper();

  function __migration(uint256 deployerPK, address) public override {
    address diamond = getDeployment("town");
    uint256 index = 0;

    vm.startBroadcast(deployerPK);
    address membership = address(new MembershipFacet());
    vm.stopBroadcast();

    membershipHelper.addSelectors(erc721aHelper.selectors());

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);

    // Replace the membership facet
    cuts[index++] = IDiamond.FacetCut({
      facetAddress: membership,
      action: IDiamond.FacetCutAction.Replace,
      functionSelectors: membershipHelper.selectors()
    });

    vm.startBroadcast(deployerPK);
    IDiamondCut(diamond).diamondCut(cuts, address(0), "");
    vm.stopBroadcast();
  }
}
