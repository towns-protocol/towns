// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

//interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";

//libraries

//contracts
import {Interaction} from "../common/Interaction.s.sol";

import {TownOwner} from "contracts/src/towns/facets/owner/TownOwner.sol";
import {TownOwnerHelper} from "contracts/test/towns/owner/TownOwnerSetup.sol";

import {ERC721AHelper} from "contracts/test/diamond/erc721a/ERC721ASetup.sol";
import {VotesHelper} from "contracts/test/governance/votes/VotesSetup.sol";

contract MigrateTownOwner is Interaction {
  TownOwnerHelper townOwnerHelper = new TownOwnerHelper();
  ERC721AHelper erc721aHelper = new ERC721AHelper();
  VotesHelper votesHelper = new VotesHelper();

  function __interact(uint256 deployerPK, address) public override {
    address diamond = getDeployment("townOwner");

    vm.startBroadcast(deployerPK);
    address townOwner = address(new TownOwner());
    vm.stopBroadcast();

    townOwnerHelper.addSelectors(erc721aHelper.selectors());
    townOwnerHelper.addSelectors(votesHelper.selectors());

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);

    cuts[0] = IDiamond.FacetCut({
      facetAddress: townOwner,
      action: IDiamond.FacetCutAction.Replace,
      functionSelectors: townOwnerHelper.selectors()
    });

    vm.startBroadcast(deployerPK);
    IDiamondCut(diamond).diamondCut(cuts, address(0), "");
    vm.stopBroadcast();
  }
}
