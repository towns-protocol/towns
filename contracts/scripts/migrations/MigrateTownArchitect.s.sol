// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

//interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";

//libraries

//contracts
import {Migration} from "../common/Migration.s.sol";

import {TownArchitectHelper} from "contracts/test/towns/architect/TownArchitectSetup.sol";

import {TownArchitect} from "contracts/src/towns/facets/architect/TownArchitect.sol";

contract MigrateTownArchitect is Migration {
  TownArchitectHelper townArchitectHelper = new TownArchitectHelper();

  function __migration(uint256 deployerPK, address) public override {
    address diamond = getDeployment("townFactory");

    vm.startBroadcast(deployerPK);
    address townArchitect = address(new TownArchitect());
    vm.stopBroadcast();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](2);

    bytes4[] memory selectors = new bytes4[](2);
    selectors[0] = TownArchitect.getTokenIdByTown.selector;
    selectors[1] = TownArchitect.isTown.selector;

    cuts[0] = IDiamond.FacetCut({
      facetAddress: townArchitect,
      action: IDiamond.FacetCutAction.Add,
      functionSelectors: selectors
    });

    cuts[1] = IDiamond.FacetCut({
      facetAddress: townArchitect,
      action: IDiamond.FacetCutAction.Replace,
      functionSelectors: townArchitectHelper.selectors()
    });

    vm.startBroadcast(deployerPK);
    IDiamondCut(diamond).diamondCut(cuts, address(0), "");
    vm.stopBroadcast();
  }
}
