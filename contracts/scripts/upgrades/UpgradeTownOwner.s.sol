// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

//interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";

//libraries

//contracts
import {Upgrader} from "../common/Upgrader.s.sol";

import {DiamondCutFacet} from "contracts/src/diamond/facets/cut/DiamondCutFacet.sol";
import {TownOwner} from "contracts/src/towns/facets/owner/TownOwner.sol";
import {GuardianFacet} from "contracts/src/towns/facets/guardian/GuardianFacet.sol";

import {GuardianHelper} from "contracts/test/towns/guardian/GuardianSetup.sol";
import {TownOwnerHelper} from "contracts/test/towns/owner/TownOwnerSetup.sol";
import {DiamondCutHelper} from "contracts/test/diamond/cut/DiamondCutSetup.sol";

contract UpgradeTownOwner is Upgrader {
  DiamondCutHelper diamondCutHelper = new DiamondCutHelper();
  TownOwnerHelper townOwnerHelper = new TownOwnerHelper();
  GuardianHelper guardianHelper = new GuardianHelper();

  address diamondCut;
  address townOwner;
  address guardian;

  function __upgrade(uint256 deployerPK, address) public override {
    address diamond = getDeployment("townOwner");

    vm.startBroadcast(deployerPK);
    diamondCut = address(new DiamondCutFacet());
    townOwner = address(new TownOwner());
    guardian = address(new GuardianFacet());
    vm.stopBroadcast();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
    cuts[0] = diamondCutHelper.makeCut(
      diamondCut,
      IDiamond.FacetCutAction.Replace
    );

    vm.startBroadcast();
    IDiamondCut(diamond).diamondCut(cuts, address(0), "");
    vm.stopBroadcast();

    IDiamond.FacetCut[] memory cuts2 = new IDiamond.FacetCut[](2);
    uint256 index;

    cuts2[index++] = townOwnerHelper.makeCut(
      townOwner,
      IDiamond.FacetCutAction.Replace
    );
    cuts2[index++] = guardianHelper.makeCut(
      guardian,
      IDiamond.FacetCutAction.Add
    );

    vm.startBroadcast(deployerPK);
    IDiamondCut(diamond).diamondCut(
      cuts2,
      guardian,
      guardianHelper.makeInitData(7 days)
    );
    vm.stopBroadcast();
  }
}
