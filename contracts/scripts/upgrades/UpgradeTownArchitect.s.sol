// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

//interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";

//libraries

//contracts
import {Upgrader} from "../common/Upgrader.s.sol";

import {TownArchitect} from "contracts/src/towns/facets/architect/TownArchitect.sol";

import {TownArchitectHelper} from "contracts/test/towns/architect/TownArchitectSetup.sol";

contract UpgradeTownArchitect is Upgrader {
  TownArchitectHelper townArchitectHelper = new TownArchitectHelper();

  function __upgrade(uint256 deployerPK, address) public override {
    address townFactory = getDeployment("townFactory");

    vm.broadcast(deployerPK);
    address townArchitect = address(new TownArchitect());

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
    cuts[0] = townArchitectHelper.makeCut(
      townArchitect,
      IDiamond.FacetCutAction.Replace
    );

    vm.broadcast(deployerPK);
    IDiamondCut(townFactory).diamondCut(cuts, address(0), "");
  }
}
