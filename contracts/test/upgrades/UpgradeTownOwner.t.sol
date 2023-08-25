// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

//interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";

//libraries

//contracts
import {DiamondCutFacet} from "contracts/src/diamond/facets/cut/DiamondCutFacet.sol";
import {TownOwner} from "contracts/src/towns/facets/owner/TownOwner.sol";
import {GuardianFacet} from "contracts/src/towns/facets/guardian/GuardianFacet.sol";

import {GuardianHelper} from "contracts/test/towns/guardian/GuardianSetup.sol";
import {TownOwnerHelper} from "contracts/test/towns/owner/TownOwnerSetup.sol";
import {DiamondCutHelper} from "contracts/test/diamond/cut/DiamondCutSetup.sol";

contract UpgradeTownOwner is TestUtils {
  uint256 sepoliaFork;

  address diamond = 0x63dC17A0a1285e80869571DB3e377E31B890be2F;
  address deployer = 0x86312a65B491CF25D9D265f6218AB013DaCa5e19;

  function setUp() public {
    sepoliaFork = vm.createFork("sepolia");
  }

  function test_diamondCut() external {
    vm.selectFork(sepoliaFork);
    DiamondCutHelper diamondCutHelper = new DiamondCutHelper();
    GuardianHelper guardianHelper = new GuardianHelper();
    TownOwnerHelper townOwnerHelper = new TownOwnerHelper();

    address diamondCut = address(new DiamondCutFacet());
    address guardian = address(new GuardianFacet());
    address townOwner = address(new TownOwner());

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
    cuts[0] = diamondCutHelper.makeCut(
      diamondCut,
      IDiamond.FacetCutAction.Replace
    );

    vm.startPrank(deployer);
    IDiamondCut(diamond).diamondCut(cuts, address(0), "");
    vm.stopPrank();

    IDiamond.FacetCut[] memory newCuts = new IDiamond.FacetCut[](2);
    newCuts[0] = guardianHelper.makeCut(guardian, IDiamond.FacetCutAction.Add);
    newCuts[1] = townOwnerHelper.makeCut(
      townOwner,
      IDiamond.FacetCutAction.Replace
    );

    vm.startPrank(deployer);
    IDiamondCut(diamond).diamondCut(
      newCuts,
      guardian,
      guardianHelper.makeInitData(7 days)
    );
    vm.stopPrank();
  }
}
