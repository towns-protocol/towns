// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IERC721A} from "contracts/src/diamond/facets/token/ERC721A/IERC721A.sol";

//libraries

//contracts
import {DiamondDeployer} from "../common/DiamondDeployer.s.sol";

import {TokenPausableHelper} from "contracts/test/diamond/pausable/token/TokenPausableSetup.sol";
import {MembershipReferralHelper} from "contracts/test/spaces/membership/MembershipReferralSetup.sol";
import {ERC721AHelper} from "contracts/test/diamond/erc721a/ERC721ASetup.sol";

// Facets

import {Banning} from "contracts/src/spaces/facets/banning/Banning.sol";

import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

import {DeployDiamondCut} from "contracts/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "contracts/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployIntrospection} from "contracts/scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployEntitlementGated} from "contracts/scripts/deployments/facets/DeployEntitlementGated.s.sol";
import {DeployERC721AQueryable} from "./facets/DeployERC721AQueryable.s.sol";
import {DeployBanning} from "contracts/scripts/deployments/facets/DeployBanning.s.sol";
import {DeployMembershipMetadata} from "contracts/scripts/deployments/facets/DeployMembershipMetadata.s.sol";
import {DeployMembership} from "contracts/scripts/deployments/facets/DeployMembership.s.sol";
import {DeployEntitlementDataQueryable} from "./facets/DeployEntitlementDataQueryable.s.sol";
import {DeployOwnablePendingFacet} from "contracts/scripts/deployments/facets/DeployOwnablePendingFacet.s.sol";
import {DeployTokenOwnable} from "./facets/DeployTokenOwnable.s.sol";
import {DeployEntitlementsManager} from "contracts/scripts/deployments/facets/DeployEntitlementsManager.s.sol";
import {DeployRoles} from "contracts/scripts/deployments/facets/DeployRoles.s.sol";
import {DeployChannels} from "contracts/scripts/deployments/facets/DeployChannels.s.sol";
import {DeployTokenPausable} from "contracts/scripts/deployments/facets/DeployTokenPausable.s.sol";
import {DeployMembershipReferral} from "contracts/scripts/deployments/facets/DeployMembershipReferral.s.sol";
import {DeployMultiInit} from "contracts/scripts/deployments/DeployMultiInit.s.sol";

contract DeploySpace is DiamondDeployer {
  address internal constant GOVERNANCE_ADDRESS =
    0x63217D4c321CC02Ed306cB3843309184D347667B;

  DeployDiamondCut diamondCutHelper = new DeployDiamondCut();
  DeployDiamondLoupe diamondLoupeHelper = new DeployDiamondLoupe();
  DeployIntrospection introspectionHelper = new DeployIntrospection();
  DeployEntitlementGated entitlementGatedHelper = new DeployEntitlementGated();
  DeployERC721AQueryable erc721aQueryableHelper = new DeployERC721AQueryable();
  DeployBanning banningHelper = new DeployBanning();
  DeployMembership membershipHelper = new DeployMembership();
  DeployMembershipMetadata membershipMetadataHelper =
    new DeployMembershipMetadata();
  DeployEntitlementDataQueryable entitlementDataQueryableHelper =
    new DeployEntitlementDataQueryable();
  DeployOwnablePendingFacet ownablePendingHelper =
    new DeployOwnablePendingFacet();
  DeployTokenOwnable tokenOwnableHelper = new DeployTokenOwnable();
  DeployEntitlementsManager entitlementsHelper =
    new DeployEntitlementsManager();

  DeployRoles rolesHelper = new DeployRoles();
  DeployChannels channelsHelper = new DeployChannels();
  DeployTokenPausable tokenPausableHelper = new DeployTokenPausable();
  DeployMembershipReferral membershipReferralHelper =
    new DeployMembershipReferral();
  DeployMultiInit deployMultiInit = new DeployMultiInit();

  ERC721AHelper erc721aHelper = new ERC721AHelper();

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
  address entitlementDataQueryable;
  address ownablePending;
  address multiInit;

  function versionName() public pure override returns (string memory) {
    return "space";
  }

  function diamondInitParams(
    address
  ) public override returns (Diamond.InitParams memory) {
    diamondCut = diamondCutHelper.deploy();
    diamondLoupe = diamondLoupeHelper.deploy();
    introspection = introspectionHelper.deploy();
    erc721aQueryable = erc721aQueryableHelper.deploy();
    banning = banningHelper.deploy();
    membership = membershipHelper.deploy();
    membershipMetadata = membershipMetadataHelper.deploy();
    entitlementDataQueryable = entitlementDataQueryableHelper.deploy();
    ownablePending = ownablePendingHelper.deploy();
    tokenOwnable = tokenOwnableHelper.deploy();
    entitlements = entitlementsHelper.deploy();
    roles = rolesHelper.deploy();
    channels = channelsHelper.deploy();
    tokenPausable = tokenPausableHelper.deploy();
    membershipReferral = membershipReferralHelper.deploy();
    multiInit = deployMultiInit.deploy();

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
    addCut(
      entitlementDataQueryableHelper.makeCut(
        entitlementDataQueryable,
        IDiamond.FacetCutAction.Add
      )
    );
    addCut(
      ownablePendingHelper.makeCut(ownablePending, IDiamond.FacetCutAction.Add)
    );

    addInit(
      ownablePending,
      ownablePendingHelper.makeInitData(GOVERNANCE_ADDRESS)
    );
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
