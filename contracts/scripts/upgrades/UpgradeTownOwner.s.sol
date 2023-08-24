// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

//interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";

//libraries

//contracts
import {Upgrader} from "../common/Upgrader.s.sol";

import {TownOwner} from "contracts/src/towns/facets/owner/TownOwner.sol";
import {GuardianFacet} from "contracts/src/towns/facets/guardian/GuardianFacet.sol";

import {GuardianHelper} from "contracts/test/towns/guardian/GuardianSetup.sol";
import {TownOwnerHelper} from "contracts/test/towns/owner/TownOwnerSetup.sol";

contract UpgradeTownOwner is Upgrader {
  TownOwnerHelper townOwnerHelper = new TownOwnerHelper();
  GuardianHelper guardianHelper = new GuardianHelper();

  address townOwner;
  address guardian;

  function __upgrade(uint256 deployerPK, address) public override {
    address diamond = getAddress("townOwner");

    vm.startBroadcast(deployerPK);
    townOwner = address(new TownOwner());
    guardian = address(new GuardianFacet());
    vm.stopBroadcast();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](2);
    uint256 index;

    cuts[index++] = townOwnerHelper.makeCut(
      townOwner,
      IDiamond.FacetCutAction.Replace
    );
    cuts[index++] = guardianHelper.makeCut(
      guardian,
      IDiamond.FacetCutAction.Add
    );

    vm.startBroadcast(deployerPK);
    IDiamondCut(diamond).diamondCut(
      cuts,
      guardian,
      guardianHelper.makeInitData(7 days)
    );
    vm.stopBroadcast();
  }
}
