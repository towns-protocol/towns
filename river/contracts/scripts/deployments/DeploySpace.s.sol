// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IERC721A} from "contracts/src/diamond/facets/token/ERC721A/IERC721A.sol";

//libraries

//contracts
import {DiamondDeployer} from "../common/DiamondDeployer.s.sol";

import {OwnablePendingHelper} from "contracts/test/diamond/ownable/pending/OwnablePendingSetup.sol";
import {TokenOwnableHelper} from "contracts/test/diamond/ownable/token/TokenOwnableSetup.sol";
import {EntitlementsManagerHelper} from "contracts/test/spaces/entitlements/EntitlementsManagerHelper.sol";
import {RolesHelper} from "contracts/test/spaces/roles/RolesHelper.sol";
import {ChannelsHelper} from "contracts/test/spaces/channels/ChannelsHelper.sol";
import {TokenPausableHelper} from "contracts/test/diamond/pausable/token/TokenPausableSetup.sol";
import {MembershipReferralHelper} from "contracts/test/spaces/membership/MembershipReferralSetup.sol";
import {ERC721AHelper} from "contracts/test/diamond/erc721a/ERC721ASetup.sol";

// Facets
import {OwnablePendingFacet} from "contracts/src/diamond/facets/ownable/pending/OwnablePendingFacet.sol";
import {TokenOwnableFacet} from "contracts/src/diamond/facets/ownable/token/TokenOwnableFacet.sol";
import {EntitlementsManager} from "contracts/src/spaces/facets/entitlements/EntitlementsManager.sol";
import {Channels} from "contracts/src/spaces/facets/channels/Channels.sol";
import {Roles} from "contracts/src/spaces/facets/roles/Roles.sol";
import {TokenPausableFacet} from "contracts/src/diamond/facets/pausable/token/TokenPausableFacet.sol";
import {MembershipReferralFacet} from "contracts/src/spaces/facets/membership/referral/MembershipReferralFacet.sol";
import {Banning} from "contracts/src/spaces/facets/banning/Banning.sol";

import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

import {DeployDiamondCut} from "contracts/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "contracts/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployIntrospection} from "contracts/scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployEntitlementGated} from "contracts/scripts/deployments/facets/DeployEntitlementGated.s.sol";
import {DeployERC721AQueryable} from "./facets/DeployERC721AQueryable.s.sol";
import {DeployBanning} from "contracts/scripts/deployments/facets/DeployBanning.s.sol";
import {DeployMembershipMetadata} from "contracts/scripts/deployments/facets/DeployMembershipMetadata.s.sol";
import {DeployMembership} from "contracts/scripts/deployments/DeployMembership.s.sol";
import {DeployMultiInit} from "contracts/scripts/deployments/DeployMultiInit.s.sol";

contract DeploySpace is DiamondDeployer {
  DeployDiamondCut diamondCutHelper = new DeployDiamondCut();
  DeployDiamondLoupe diamondLoupeHelper = new DeployDiamondLoupe();
  DeployIntrospection introspectionHelper = new DeployIntrospection();
  DeployEntitlementGated entitlementGatedHelper = new DeployEntitlementGated();
  DeployERC721AQueryable erc721aQueryableHelper = new DeployERC721AQueryable();
  DeployBanning banningHelper = new DeployBanning();
  DeployMembership membershipHelper = new DeployMembership();
  DeployMembershipMetadata membershipMetadataHelper =
    new DeployMembershipMetadata();
  DeployMultiInit deployMultiInit = new DeployMultiInit();

  TokenOwnableHelper tokenOwnableHelper = new TokenOwnableHelper();
  OwnablePendingHelper ownableHelper = new OwnablePendingHelper();
  EntitlementsManagerHelper entitlementsHelper =
    new EntitlementsManagerHelper();
  RolesHelper rolesHelper = new RolesHelper();
  ChannelsHelper channelsHelper = new ChannelsHelper();
  TokenPausableHelper tokenPausableHelper = new TokenPausableHelper();
  ERC721AHelper erc721aHelper = new ERC721AHelper();
  MembershipReferralHelper membershipReferralHelper =
    new MembershipReferralHelper();

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
  address entitlementGated;
  address erc721aQueryable;
  address membershipMetadata;
  address multiInit;

  function versionName() public pure override returns (string memory) {
    return "space";
  }

  function diamondInitParams(
    uint256 deployerPK,
    address deployer
  ) public override returns (Diamond.InitParams memory) {
    diamondCut = diamondCutHelper.deploy();
    diamondLoupe = diamondLoupeHelper.deploy();
    introspection = introspectionHelper.deploy();
    erc721aQueryable = erc721aQueryableHelper.deploy();
    banning = banningHelper.deploy();
    membership = membershipHelper.deploy();
    membershipMetadata = membershipMetadataHelper.deploy();
    multiInit = deployMultiInit.deploy();

    vm.startBroadcast(deployerPK);
    ownable = address(new OwnablePendingFacet());
    tokenOwnable = address(new TokenOwnableFacet());
    entitlements = address(new EntitlementsManager());
    channels = address(new Channels());
    roles = address(new Roles());
    tokenPausable = address(new TokenPausableFacet());
    membershipReferral = address(new MembershipReferralFacet());
    vm.stopBroadcast();

    membershipHelper.addSelectors(erc721aHelper.selectors());
    membershipHelper.removeSelector(IERC721A.tokenURI.selector);

    addCut(
      tokenOwnableHelper.makeCut(tokenOwnable, IDiamond.FacetCutAction.Add)
    );
    addCut(diamondCutHelper.makeCut(diamondCut, IDiamond.FacetCutAction.Add));
    addCut(
      diamondLoupeHelper.makeCut(diamondLoupe, IDiamond.FacetCutAction.Add)
    );
    addCut(
      introspectionHelper.makeCut(introspection, IDiamond.FacetCutAction.Add)
    );
    addCut(
      entitlementsHelper.makeCut(entitlements, IDiamond.FacetCutAction.Add)
    );
    addCut(rolesHelper.makeCut(roles, IDiamond.FacetCutAction.Add));
    addCut(
      tokenPausableHelper.makeCut(tokenPausable, IDiamond.FacetCutAction.Add)
    );
    addCut(channelsHelper.makeCut(channels, IDiamond.FacetCutAction.Add));

    addCut(membershipHelper.makeCut(membership, IDiamond.FacetCutAction.Add));
    addCut(
      membershipReferralHelper.makeCut(
        membershipReferral,
        IDiamond.FacetCutAction.Add
      )
    );
    addCut(banningHelper.makeCut(banning, IDiamond.FacetCutAction.Add));
    addCut(
      membershipMetadataHelper.makeCut(
        membershipMetadata,
        IDiamond.FacetCutAction.Add
      )
    );
    addCut(
      entitlementGatedHelper.makeCut(membership, IDiamond.FacetCutAction.Add)
    );
    addCut(
      erc721aQueryableHelper.makeCut(
        erc721aQueryable,
        IDiamond.FacetCutAction.Add
      )
    );

    addInit(ownable, ownableHelper.makeInitData(deployer));
    addInit(diamondCut, diamondCutHelper.makeInitData(""));
    addInit(diamondLoupe, diamondLoupeHelper.makeInitData(""));
    addInit(introspection, introspectionHelper.makeInitData(""));

    return
      Diamond.InitParams({
        baseFacets: baseFacets(),
        init: multiInit,
        initData: abi.encodeWithSelector(
          MultiInit.multiInit.selector,
          _initAddresses,
          _initDatas
        )
      });
  }
}
