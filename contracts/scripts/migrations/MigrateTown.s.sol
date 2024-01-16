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
import {RolesHelper} from "contracts/test/towns/roles/RolesSetup.sol";
import {BanningHelper} from "contracts/test/towns/banning/BanningHelper.sol";

// facets
import {Channels} from "contracts/src/towns/facets/channels/Channels.sol";
import {EntitlementsManager} from "contracts/src/towns/facets/entitlements/EntitlementsManager.sol";
import {Roles} from "contracts/src/towns/facets/roles/Roles.sol";
import {Banning} from "contracts/src/towns/facets/banning/Banning.sol";

contract MigrateTown is Migration {
  ChannelsHelper channelsHelper = new ChannelsHelper();
  EntitlementsHelper entitlementsHelper = new EntitlementsHelper();
  RolesHelper rolesHelper = new RolesHelper();
  BanningHelper banningHelper = new BanningHelper();

  function __migration(uint256 deployerPK, address) public override {
    address diamond = getDeployment("town");
    uint256 index = 0;

    vm.startBroadcast(deployerPK);
    address entitlementsManager = address(new EntitlementsManager());
    address channels = address(new Channels());
    address roles = address(new Roles());
    address banning = address(new Banning());
    vm.stopBroadcast();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](4);

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

    cuts[index++] = IDiamond.FacetCut({
      facetAddress: roles,
      action: IDiamond.FacetCutAction.Replace,
      functionSelectors: rolesHelper.selectors()
    });

    cuts[index++] = IDiamond.FacetCut({
      facetAddress: banning,
      action: IDiamond.FacetCutAction.Add,
      functionSelectors: banningHelper.selectors()
    });

    vm.startBroadcast(deployerPK);
    IDiamondCut(diamond).diamondCut(cuts, address(0), "");
    vm.stopBroadcast();
  }
}
