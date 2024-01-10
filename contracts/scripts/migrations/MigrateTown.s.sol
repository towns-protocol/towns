// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

//interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";

//contracts
import {Migration} from "../common/Migration.s.sol";

// helpers
import {ChannelsHelper} from "contracts/test/towns/channels/ChannelsSetup.sol";
import {EntitlementsHelper} from "contracts/test/towns/entitlements/EntitlementsSetup.sol";

// facets
import {Channels} from "contracts/src/towns/facets/channels/Channels.sol";
import {EntitlementsManager} from "contracts/src/towns/facets/entitlements/EntitlementsManager.sol";

contract MigrateTown is Migration {
  ChannelsHelper channelsHelper = new ChannelsHelper();
  EntitlementsHelper entitlementsHelper = new EntitlementsHelper();

  function __migration(uint256 deployerPK, address) public override {
    address diamond = getDeployment("town");
    uint256 index = 0;

    vm.startBroadcast(deployerPK);
    address entitlementsManager = address(new EntitlementsManager());
    address channels = address(new Channels());
    vm.stopBroadcast();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](2);

    // Replace the membership facet
    cuts[index++] = IDiamond.FacetCut({
      facetAddress: entitlementsManager,
      action: IDiamond.FacetCutAction.Replace,
      functionSelectors: entitlementsHelper.selectors()
    });

    cuts[index++] = IDiamond.FacetCut({
      facetAddress: channels,
      action: IDiamond.FacetCutAction.Replace,
      functionSelectors: channelsHelper.selectors()
    });

    vm.startBroadcast(deployerPK);
    IDiamondCut(diamond).diamondCut(cuts, address(0), "");
    vm.stopBroadcast();
  }
}
