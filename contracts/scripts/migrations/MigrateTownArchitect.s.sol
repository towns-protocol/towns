// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

//interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";

//libraries

//contracts
import {Migration} from "../common/Migration.s.sol";

import {TownArchitectHelper} from "contracts/test/towns/architect/TownArchitectSetup.sol";
import {PlatformRequirementsHelper} from "contracts/test/towns/platform/requirements/PlatformRequirementsSetup.sol";

import {TownArchitect} from "contracts/src/towns/facets/architect/TownArchitect.sol";
import {PlatformRequirementsFacet} from "contracts/src/towns/facets/platform/requirements/PlatformRequirementsFacet.sol";

contract MigrateTownArchitect is Migration {
  TownArchitectHelper townArchitectHelper = new TownArchitectHelper();
  PlatformRequirementsHelper platformReqsHelper =
    new PlatformRequirementsHelper();

  function __migration(uint256 deployerPK, address) public override {
    address diamond = getDeployment("townFactory");

    vm.startBroadcast(deployerPK);
    address townArchitect = address(new TownArchitect());
    address platformReqs = address(new PlatformRequirementsFacet());
    vm.stopBroadcast();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](3);

    cuts[0] = IDiamond.FacetCut({
      facetAddress: townArchitect,
      action: IDiamond.FacetCutAction.Replace,
      functionSelectors: townArchitectHelper.selectors()
    });

    cuts[1] = IDiamond.FacetCut({
      facetAddress: platformReqs,
      action: IDiamond.FacetCutAction.Replace,
      functionSelectors: platformReqsHelper.selectors()
    });

    bytes4[] memory selectorsToRemove = new bytes4[](1);
    selectorsToRemove[0] = PlatformRequirementsFacet.getDenominator.selector;

    cuts[2] = IDiamond.FacetCut({
      facetAddress: platformReqs,
      action: IDiamond.FacetCutAction.Remove,
      functionSelectors: selectorsToRemove
    });

    vm.startBroadcast(deployerPK);
    IDiamondCut(diamond).diamondCut(cuts, address(0), "");
    vm.stopBroadcast();
  }
}
