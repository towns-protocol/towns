// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

// interface
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";

// libraries

// contracts
import {Deployer} from "./common/Deployer.s.sol";

import {EntitlementsHelper} from "contracts/test/towns/facets/entitlements/EntitlementsSetup.sol";
import {ChannelsHelper} from "contracts/test/towns/facets/channels/ChannelsSetup.sol";
import {RolesHelper} from "contracts/test/towns/facets/roles/RolesSetup.sol";

import {Entitlements} from "contracts/src/towns/facets/entitlements/Entitlements.sol";
import {Channels} from "contracts/src/towns/facets/channels/Channels.sol";
import {Roles} from "contracts/src/towns/facets/roles/Roles.sol";
import {Town} from "contracts/src/towns/Town.sol";

contract DeployTown is Deployer {
  EntitlementsHelper entitlementsHelper = new EntitlementsHelper();
  ChannelsHelper channelsHelper = new ChannelsHelper();
  RolesHelper rolesHelper = new RolesHelper();

  function versionName() public pure override returns (string memory) {
    return "town";
  }

  function __deploy(uint256 deployerPK) public override returns (address) {
    vm.startBroadcast(deployerPK);
    address entitlements = address(new Entitlements());
    address channels = address(new Channels());
    address roles = address(new Roles());
    address town = address(new Town());
    vm.stopBroadcast();

    info("Entitlements Facet deployed at", entitlements);
    info("Channels Facet deployed at", channels);
    info("Roles Facet deployed at", roles);

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](3);
    uint256 index;

    cuts[index++] = entitlementsHelper.makeDeployCut(
      entitlements,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = channelsHelper.makeDeployCut(
      channels,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = rolesHelper.makeDeployCut(
      roles,
      IDiamond.FacetCutAction.Add
    );

    vm.broadcast(deployerPK);
    IDiamondCut(town).diamondCut(cuts, address(0), "");

    return town;
  }
}
