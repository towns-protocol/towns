// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

//interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

//libraries

//contracts
import {DiamondDeployer} from "../common/DiamondDeployer.s.sol";

import {OwnablePendingHelper} from "contracts/test/diamond/ownable/pending/OwnablePendingSetup.sol";
import {TokenOwnableHelper} from "contracts/test/diamond/ownable/token/TokenOwnableSetup.sol";
import {DiamondCutHelper} from "contracts/test/diamond/cut/DiamondCutSetup.sol";
import {DiamondLoupeHelper} from "contracts/test/diamond/loupe/DiamondLoupeSetup.sol";
import {EntitlementsHelper} from "contracts/test/towns/entitlements/EntitlementsSetup.sol";
import {RolesHelper} from "contracts/test/towns/roles/RolesSetup.sol";
import {ChannelsHelper} from "contracts/test/towns/channels/ChannelsSetup.sol";
import {TokenPausableHelper} from "contracts/test/diamond/pausable/token/TokenPausableSetup.sol";
import {IntrospectionHelper} from "contracts/test/diamond/introspection/IntrospectionSetup.sol";
import {MembershipHelper} from "contracts/test/towns/membership/MembershipSetup.sol";

// Facets
import {OwnablePendingFacet} from "contracts/src/diamond/facets/ownable/pending/OwnablePendingFacet.sol";
import {TokenOwnableFacet} from "contracts/src/diamond/facets/ownable/token/TokenOwnableFacet.sol";
import {DiamondCutFacet} from "contracts/src/diamond/facets/cut/DiamondCutFacet.sol";
import {DiamondLoupeFacet} from "contracts/src/diamond/facets/loupe/DiamondLoupeFacet.sol";
import {EntitlementsManager} from "contracts/src/towns/facets/entitlements/EntitlementsManager.sol";
import {Channels} from "contracts/src/towns/facets/channels/Channels.sol";
import {Roles} from "contracts/src/towns/facets/roles/Roles.sol";
import {TokenPausableFacet} from "contracts/src/diamond/facets/pausable/token/TokenPausableFacet.sol";
import {IntrospectionFacet} from "contracts/src/diamond/facets/introspection/IntrospectionFacet.sol";
import {MembershipFacet} from "contracts/src/towns/facets/membership/MembershipFacet.sol";

import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

contract DeployTown is DiamondDeployer {
  TokenOwnableHelper tokenOwnableHelper = new TokenOwnableHelper();
  OwnablePendingHelper ownableHelper = new OwnablePendingHelper();
  DiamondCutHelper diamondCutHelper = new DiamondCutHelper();
  DiamondLoupeHelper diamondLoupeHelper = new DiamondLoupeHelper();
  EntitlementsHelper entitlementsHelper = new EntitlementsHelper();
  RolesHelper rolesHelper = new RolesHelper();
  ChannelsHelper channelsHelper = new ChannelsHelper();
  TokenPausableHelper tokenPausableHelper = new TokenPausableHelper();
  IntrospectionHelper introspectionHelper = new IntrospectionHelper();
  MembershipHelper membershipHelper = new MembershipHelper();

  address[] initAddresses = new address[](4);
  bytes[] initDatas = new bytes[](4);

  address ownable;
  address tokenOwnable;
  address diamondCut;
  address diamondLoupe;
  address entitlements;
  address channels;
  address roles;
  address tokenPausable;
  address introspection;
  address membership;
  address town;

  address multiInit;

  function versionName() public pure override returns (string memory) {
    return "town";
  }

  function diamondInitParams(
    uint256 deployerPK,
    address deployer
  ) public override returns (Diamond.InitParams memory) {
    vm.startBroadcast(deployerPK);
    ownable = address(new OwnablePendingFacet());
    tokenOwnable = address(new TokenOwnableFacet());
    diamondCut = address(new DiamondCutFacet());
    diamondLoupe = address(new DiamondLoupeFacet());
    entitlements = address(new EntitlementsManager());
    channels = address(new Channels());
    roles = address(new Roles());
    tokenPausable = address(new TokenPausableFacet());
    introspection = address(new IntrospectionFacet());
    membership = address(new MembershipFacet());
    multiInit = address(new MultiInit());
    vm.stopBroadcast();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](9);

    cuts[index++] = tokenOwnableHelper.makeCut(
      tokenOwnable,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = diamondCutHelper.makeCut(
      diamondCut,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = diamondLoupeHelper.makeCut(
      diamondLoupe,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = entitlementsHelper.makeCut(
      entitlements,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = rolesHelper.makeCut(roles, IDiamond.FacetCutAction.Add);
    cuts[index++] = tokenPausableHelper.makeCut(
      tokenPausable,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = channelsHelper.makeCut(
      channels,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = introspectionHelper.makeCut(
      introspection,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = membershipHelper.makeCut(
      membership,
      IDiamond.FacetCutAction.Add
    );

    _resetIndex();

    initAddresses[index++] = ownable;
    initAddresses[index++] = diamondCut;
    initAddresses[index++] = diamondLoupe;
    initAddresses[index++] = introspection;

    _resetIndex();

    initDatas[index++] = ownableHelper.makeInitData(deployer);
    initDatas[index++] = diamondCutHelper.makeInitData("");
    initDatas[index++] = diamondLoupeHelper.makeInitData("");
    initDatas[index++] = introspectionHelper.makeInitData("");

    return
      Diamond.InitParams({
        baseFacets: cuts,
        init: multiInit,
        initData: abi.encodeWithSelector(
          MultiInit.multiInit.selector,
          initAddresses,
          initDatas
        )
      });
  }
}
