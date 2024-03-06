// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

//interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

//libraries

//contracts
import {DiamondDeployer} from "../common/DiamondDeployer.s.sol";

import {OwnablePendingHelper} from "contracts/test/diamond/ownable/pending/OwnablePendingSetup.sol";
import {TokenOwnableHelper} from "contracts/test/diamond/ownable/token/TokenOwnableSetup.sol";
import {DiamondCutHelper} from "contracts/test/diamond/cut/DiamondCutSetup.sol";
import {DiamondLoupeHelper} from "contracts/test/diamond/loupe/DiamondLoupeSetup.sol";
import {EntitlementsHelper} from "contracts/test/spaces/entitlements/EntitlementsSetup.sol";
import {RolesHelper} from "contracts/test/spaces/roles/RolesHelper.sol";
import {ChannelsHelper} from "contracts/test/spaces/channels/ChannelsHelper.sol";
import {TokenPausableHelper} from "contracts/test/diamond/pausable/token/TokenPausableSetup.sol";
import {IntrospectionHelper} from "contracts/test/diamond/introspection/IntrospectionSetup.sol";
import {MembershipHelper} from "contracts/test/spaces/membership/MembershipHelper.sol";
import {MembershipReferralHelper} from "contracts/test/spaces/membership/MembershipReferralSetup.sol";
import {ERC721AHelper} from "contracts/test/diamond/erc721a/ERC721ASetup.sol";
import {BanningHelper} from "contracts/test/spaces/banning/BanningHelper.sol";

// Facets
import {OwnablePendingFacet} from "contracts/src/diamond/facets/ownable/pending/OwnablePendingFacet.sol";
import {TokenOwnableFacet} from "contracts/src/diamond/facets/ownable/token/TokenOwnableFacet.sol";
import {DiamondCutFacet} from "contracts/src/diamond/facets/cut/DiamondCutFacet.sol";
import {DiamondLoupeFacet} from "contracts/src/diamond/facets/loupe/DiamondLoupeFacet.sol";
import {EntitlementsManager} from "contracts/src/spaces/facets/entitlements/EntitlementsManager.sol";
import {Channels} from "contracts/src/spaces/facets/channels/Channels.sol";
import {Roles} from "contracts/src/spaces/facets/roles/Roles.sol";
import {TokenPausableFacet} from "contracts/src/diamond/facets/pausable/token/TokenPausableFacet.sol";
import {IntrospectionFacet} from "contracts/src/diamond/facets/introspection/IntrospectionFacet.sol";
import {MembershipFacet} from "contracts/src/spaces/facets/membership/MembershipFacet.sol";
import {MembershipReferralFacet} from "contracts/src/spaces/facets/membership/referral/MembershipReferralFacet.sol";
import {Banning} from "contracts/src/spaces/facets/banning/Banning.sol";

import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

import {DeployMultiInit} from "contracts/scripts/deployments/DeployMultiInit.s.sol";

contract DeploySpace is DiamondDeployer {
  TokenOwnableHelper tokenOwnableHelper = new TokenOwnableHelper();
  OwnablePendingHelper ownableHelper = new OwnablePendingHelper();
  DiamondCutHelper diamondCutHelper = new DiamondCutHelper();
  DiamondLoupeHelper diamondLoupeHelper = new DiamondLoupeHelper();
  EntitlementsHelper entitlementsHelper = new EntitlementsHelper();
  RolesHelper rolesHelper = new RolesHelper();
  ChannelsHelper channelsHelper = new ChannelsHelper();
  TokenPausableHelper tokenPausableHelper = new TokenPausableHelper();
  IntrospectionHelper introspectionHelper = new IntrospectionHelper();
  ERC721AHelper erc721aHelper = new ERC721AHelper();
  MembershipHelper membershipHelper = new MembershipHelper();
  MembershipReferralHelper membershipReferralHelper =
    new MembershipReferralHelper();
  BanningHelper banningHelper = new BanningHelper();
  DeployMultiInit deployMultiInit = new DeployMultiInit();

  uint256 initDataCount = 4;

  address[] initAddresses = new address[](initDataCount);
  bytes[] initDatas = new bytes[](initDataCount);

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
  address membershipReferral;
  address banning;

  function versionName() public pure override returns (string memory) {
    return "space";
  }

  function diamondInitParams(
    uint256 deployerPK,
    address deployer
  ) public override returns (Diamond.InitParams memory) {
    address multiInit = deployMultiInit.deploy();

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
    membershipReferral = address(new MembershipReferralFacet());
    banning = address(new Banning());
    vm.stopBroadcast();

    membershipHelper.addSelectors(erc721aHelper.selectors());

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](11);

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
    cuts[index++] = membershipReferralHelper.makeCut(
      membershipReferral,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = banningHelper.makeCut(banning, IDiamond.FacetCutAction.Add);

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
