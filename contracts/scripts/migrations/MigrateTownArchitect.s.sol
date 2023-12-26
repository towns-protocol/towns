// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

//interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";
import {ITownArchitect} from "contracts/src/towns/facets/architect/ITownArchitect.sol";

//libraries

//contracts
import {Migration} from "../common/Migration.s.sol";

// helpers
import {TownArchitectHelper} from "contracts/test/towns/architect/TownArchitectSetup.sol";
import {PrepayHelper} from "contracts/test/towns/prepay/PrepaySetup.sol";

// facets
import {TownArchitect} from "contracts/src/towns/facets/architect/TownArchitect.sol";
import {PrepayFacet} from "contracts/src/towns/facets/prepay/PrepayFacet.sol";

contract MigrateTownArchitect is Migration {
  TownArchitectHelper townArchitectHelper = new TownArchitectHelper();
  PrepayHelper prepayHelper = new PrepayHelper();

  function __migration(uint256 deployerPK, address) public override {
    address diamond = getDeployment("townFactory");
    uint256 index = 0;

    vm.startBroadcast(deployerPK);
    address townArchitect = address(new TownArchitect());
    address prepay = address(new PrepayFacet());
    vm.stopBroadcast();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](4);

    // Remove the selectors from the old facet
    bytes4[] memory selectorsToRemove = new bytes4[](2);
    selectorsToRemove[0] = 0xa7b4bca0; // createTown
    selectorsToRemove[1] = 0x16c5f784; // computeTown
    cuts[index++] = IDiamond.FacetCut({
      facetAddress: 0x9B424DAd142087168ECB8C3809d4B7187d4110ce,
      action: IDiamond.FacetCutAction.Remove,
      functionSelectors: selectorsToRemove
    });

    // replace the old selectors with new facet
    townArchitectHelper.removeSelector(TownArchitect.createTown.selector);
    townArchitectHelper.removeSelector(TownArchitect.computeTown.selector);
    cuts[index++] = IDiamond.FacetCut({
      facetAddress: townArchitect,
      action: IDiamond.FacetCutAction.Replace,
      functionSelectors: townArchitectHelper.selectors()
    });

    // add the new selectors to the new facet
    bytes4[] memory selectorsToAdd = new bytes4[](2);
    selectorsToAdd[0] = TownArchitect.createTown.selector;
    selectorsToAdd[1] = TownArchitect.computeTown.selector;

    cuts[index++] = IDiamond.FacetCut({
      facetAddress: townArchitect,
      action: IDiamond.FacetCutAction.Add,
      functionSelectors: selectorsToAdd
    });

    // add the prepay facet
    cuts[index++] = IDiamond.FacetCut({
      facetAddress: prepay,
      action: IDiamond.FacetCutAction.Add,
      functionSelectors: prepayHelper.selectors()
    });

    vm.startBroadcast(deployerPK);
    IDiamondCut(diamond).diamondCut(cuts, address(0), "");
    vm.stopBroadcast();
  }
}
