// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

//interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

//libraries

//contracts
import {Deployer} from "./common/Deployer.s.sol";

import {OwnableHelper} from "contracts/test/diamond/ownable/OwnableSetup.sol";
import {DiamondCutHelper} from "contracts/test/diamond/cut/DiamondCutSetup.sol";
import {DiamondLoupeHelper} from "contracts/test/diamond/loupe/DiamondLoupeSetup.sol";
import {EntitlementsHelper} from "contracts/test/towns/entitlements/EntitlementsSetup.sol";
import {RolesHelper} from "contracts/test/towns/roles/RolesSetup.sol";
import {ChannelsHelper} from "contracts/test/towns/channels/ChannelsSetup.sol";

// Facets
import {OwnableFacet} from "contracts/src/diamond/facets/ownable/OwnableFacet.sol";
import {DiamondCutFacet} from "contracts/src/diamond/facets/cut/DiamondCutFacet.sol";
import {DiamondLoupeFacet} from "contracts/src/diamond/facets/loupe/DiamondLoupeFacet.sol";
import {Entitlements} from "contracts/src/towns/facets/entitlements/Entitlements.sol";
import {Channels} from "contracts/src/towns/facets/channels/Channels.sol";
import {Roles} from "contracts/src/towns/facets/roles/Roles.sol";

import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

contract DeployTown is Deployer {
  OwnableHelper ownableHelper = new OwnableHelper();
  DiamondCutHelper diamondCutHelper = new DiamondCutHelper();
  DiamondLoupeHelper diamondLoupeHelper = new DiamondLoupeHelper();
  EntitlementsHelper entitlementsHelper = new EntitlementsHelper();
  RolesHelper rolesHelper = new RolesHelper();
  ChannelsHelper channelsHelper = new ChannelsHelper();

  address[] initAddresses = new address[](3);
  bytes[] initDatas = new bytes[](3);

  address ownable;
  address diamondCut;
  address diamondLoupe;
  address entitlements;
  address channels;
  address roles;
  address multiInit;

  function versionName() public pure override returns (string memory) {
    return "town";
  }

  function __deploy(
    uint256 deployerPK,
    address deployer
  ) public override returns (address) {
    vm.startBroadcast(deployerPK);
    ownable = address(new OwnableFacet());
    diamondCut = address(new DiamondCutFacet());
    diamondLoupe = address(new DiamondLoupeFacet());
    entitlements = address(new Entitlements());
    channels = address(new Channels());
    roles = address(new Roles());
    multiInit = address(new MultiInit());
    vm.stopBroadcast();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](6);
    uint256 index;

    cuts[index++] = ownableHelper.makeDeployCut(
      ownable,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = diamondCutHelper.makeDeployCut(
      diamondCut,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = diamondLoupeHelper.makeDeployCut(
      diamondLoupe,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = entitlementsHelper.makeDeployCut(
      entitlements,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = rolesHelper.makeDeployCut(
      roles,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = channelsHelper.makeDeployCut(
      channels,
      IDiamond.FacetCutAction.Add
    );

    initAddresses[0] = ownable;
    initAddresses[1] = diamondCut;
    initAddresses[2] = diamondLoupe;

    initDatas[0] = ownableHelper.makeInitData(abi.encode(deployer));
    initDatas[1] = diamondCutHelper.makeInitData("");
    initDatas[2] = diamondLoupeHelper.makeInitData("");

    vm.broadcast(deployerPK);
    address town = address(
      new Diamond(
        Diamond.InitParams({
          baseFacets: cuts,
          init: multiInit,
          initData: abi.encodeWithSelector(
            MultiInit.multiInit.selector,
            initAddresses,
            initDatas
          )
        })
      )
    );

    return town;
  }
}
