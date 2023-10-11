// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

//interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";

//libraries

//contracts
import {Migration} from "../common/Migration.s.sol";

import {TownOwner} from "contracts/src/towns/facets/owner/TownOwner.sol";
import {TownOwnerHelper} from "contracts/test/towns/owner/TownOwnerSetup.sol";
import {TownOwnerInit} from "contracts/src/towns/facets/owner/TownOwnerInit.sol";

import {ERC721AHelper} from "contracts/test/diamond/erc721a/ERC721ASetup.sol";
import {VotesHelper} from "contracts/test/governance/votes/VotesSetup.sol";

contract MigrateTownOwner is Migration {
  TownOwnerHelper townOwnerHelper = new TownOwnerHelper();
  ERC721AHelper erc721aHelper = new ERC721AHelper();
  VotesHelper votesHelper = new VotesHelper();

  function __migration(uint256 deployerPK, address) public override {
    address diamond = getDeployment("townOwner");

    vm.startBroadcast(deployerPK);
    address townOwner = address(new TownOwner());
    address townOwnerInit = address(new TownOwnerInit());
    vm.stopBroadcast();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](3);

    cuts[0] = IDiamond.FacetCut({
      facetAddress: townOwner,
      action: IDiamond.FacetCutAction.Add,
      functionSelectors: votesHelper.selectors()
    });

    cuts[1] = IDiamond.FacetCut({
      facetAddress: townOwner,
      action: IDiamond.FacetCutAction.Replace,
      functionSelectors: erc721aHelper.selectors()
    });

    cuts[2] = IDiamond.FacetCut({
      facetAddress: townOwner,
      action: IDiamond.FacetCutAction.Replace,
      functionSelectors: townOwnerHelper.selectors()
    });

    vm.startBroadcast(deployerPK);
    IDiamondCut(diamond).diamondCut(
      cuts,
      townOwnerInit,
      abi.encodeWithSelector(
        TownOwnerInit.__TownOwnerInit_init.selector,
        "TownOwner",
        "1"
      )
    );
    vm.stopBroadcast();
  }
}
