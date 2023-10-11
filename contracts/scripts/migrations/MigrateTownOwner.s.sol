// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

//interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";
import {IERC721A} from "contracts/src/diamond/facets/token/ERC721A/IERC721A.sol";
import {VotesBase} from "contracts/src/diamond/facets/governance/votes/VotesBase.sol";

//libraries

//contracts
import {Migration} from "../common/Migration.s.sol";

import {TownOwner} from "contracts/src/towns/facets/owner/TownOwner.sol";
import {TownOwnerHelper} from "contracts/test/towns/owner/TownOwnerSetup.sol";
import {TownOwnerInit} from "contracts/src/towns/facets/owner/TownOwnerInit.sol";

contract MigrateTownOwner is Migration {
  TownOwnerHelper townOwnerHelper = new TownOwnerHelper();

  function __migration(uint256 deployerPK, address) public override {
    address diamond = getDeployment("townOwner");

    vm.startBroadcast(deployerPK);
    address townOwner = address(new TownOwner());
    address townOwnerInit = address(new TownOwnerInit());
    vm.stopBroadcast();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](2);
    uint256 index;

    bytes4[] memory voteSelectors = new bytes4[](9);
    voteSelectors[index++] = VotesBase.DOMAIN_SEPARATOR.selector;
    voteSelectors[index++] = VotesBase.clock.selector;
    voteSelectors[index++] = VotesBase.CLOCK_MODE.selector;
    voteSelectors[index++] = VotesBase.getVotes.selector;
    voteSelectors[index++] = VotesBase.getPastVotes.selector;
    voteSelectors[index++] = VotesBase.getPastTotalSupply.selector;
    voteSelectors[index++] = VotesBase.delegates.selector;
    voteSelectors[index++] = VotesBase.delegate.selector;
    voteSelectors[index++] = VotesBase.delegateBySig.selector;

    cuts[0] = IDiamond.FacetCut({
      facetAddress: townOwner,
      action: IDiamond.FacetCutAction.Add,
      functionSelectors: voteSelectors
    });

    index = 0;

    bytes4[] memory ercSelectors = new bytes4[](3);
    ercSelectors[index++] = IERC721A.transferFrom.selector;
    ercSelectors[index++] = bytes4(
      keccak256("safeTransferFrom(address,address,uint256)")
    );
    ercSelectors[index++] = bytes4(
      keccak256("safeTransferFrom(address,address,uint256,bytes)")
    );

    cuts[1] = IDiamond.FacetCut({
      facetAddress: townOwner,
      action: IDiamond.FacetCutAction.Replace,
      functionSelectors: ercSelectors
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
