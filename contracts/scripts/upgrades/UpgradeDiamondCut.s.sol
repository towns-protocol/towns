// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

//interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";

//contracts
import {Upgrader} from "../common/Upgrader.s.sol";
import {DiamondCutFacet} from "contracts/src/diamond/facets/cut/DiamondCutFacet.sol";

import {DiamondCutHelper} from "contracts/test/diamond/cut/DiamondCutSetup.sol";

contract UpgradeDiamondCut is Upgrader {
  DiamondCutHelper diamondCutHelper = new DiamondCutHelper();

  function __upgrade(uint256 deployerPk, address) public override {
    address diamond = getDeployment("town");

    vm.startBroadcast(deployerPk);
    address diamondCut = address(new DiamondCutFacet());
    vm.stopBroadcast();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
    cuts[0] = diamondCutHelper.makeCut(
      diamondCut,
      IDiamond.FacetCutAction.Replace
    );

    vm.startBroadcast(deployerPk);
    IDiamondCut(diamond).diamondCut(cuts, address(0), "");
    vm.stopBroadcast();
  }
}
