// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IDiamond, Diamond} from "@river-build/diamond/src/Diamond.sol";
import {IERC721A} from "contracts/src/diamond/facets/token/ERC721A/IERC721A.sol";

//libraries

//contracts
import {DiamondHelper} from "contracts/test/diamond/Diamond.t.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";

// Facets
import {MultiInit} from "@river-build/diamond/src/initializers/MultiInit.sol";

import {DeployDiamondCut} from "contracts/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "contracts/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployIntrospection} from "contracts/scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployERC721AQueryable} from "contracts/scripts/deployments/facets/DeployERC721AQueryable.s.sol";
import {DeployBanning} from "contracts/scripts/deployments/facets/DeployBanning.s.sol";
import {DeployMembershipMetadata} from "contracts/scripts/deployments/facets/DeployMembershipMetadata.s.sol";
import {DeployMembership} from "contracts/scripts/deployments/facets/DeployMembership.s.sol";
import {DeployEntitlementDataQueryable} from "contracts/scripts/deployments/facets/DeployEntitlementDataQueryable.s.sol";
import {DeployOwnablePendingFacet} from "contracts/scripts/deployments/facets/DeployOwnablePendingFacet.s.sol";
import {DeployTokenOwnable} from "contracts/scripts/deployments/facets/DeployTokenOwnable.s.sol";
import {DeployEntitlementsManager} from "contracts/scripts/deployments/facets/DeployEntitlementsManager.s.sol";
import {DeployRoles} from "contracts/scripts/deployments/facets/DeployRoles.s.sol";
import {DeployChannels} from "contracts/scripts/deployments/facets/DeployChannels.s.sol";
import {DeployTokenPausable} from "contracts/scripts/deployments/facets/DeployTokenPausable.s.sol";
import {DeployPrepayFacet} from "contracts/scripts/deployments/facets/DeployPrepayFacet.s.sol";
import {DeployReferrals} from "contracts/scripts/deployments/facets/DeployReferrals.s.sol";
import {DeployMembershipToken} from "contracts/scripts/deployments/facets/DeployMembershipToken.s.sol";
import {DeploySpaceEntitlementGated} from "contracts/scripts/deployments/facets/DeploySpaceEntitlementGated.s.sol";
import {DeployTipping} from "contracts/scripts/deployments/facets/DeployTipping.s.sol";
import {DeployMultiInit} from "contracts/scripts/deployments/utils/DeployMultiInit.s.sol";

// Test Facets
import {DeployMockLegacyMembership} from "contracts/scripts/deployments/utils/DeployMockLegacyMembership.s.sol";

contract DeploySpace is DiamondHelper, Deployer {
  DeployDiamondCut diamondCutHelper = new DeployDiamondCut();
  DeployDiamondLoupe diamondLoupeHelper = new DeployDiamondLoupe();
  DeployIntrospection introspectionHelper = new DeployIntrospection();
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

  DeployPrepayFacet prepayHelper = new DeployPrepayFacet();
  DeployReferrals referralsHelper = new DeployReferrals();
  DeployMembershipToken membershipTokenHelper = new DeployMembershipToken();
  DeploySpaceEntitlementGated entitlementGatedHelper =
    new DeploySpaceEntitlementGated();
  DeployMultiInit deployMultiInit = new DeployMultiInit();
  DeployTipping tippingHelper = new DeployTipping();

  // Test Facets
  DeployMockLegacyMembership mockLegacyMembershipHelper =
    new DeployMockLegacyMembership();

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
  address membershipToken;
  address erc721aQueryable;
  address membershipMetadata;
  address entitlementDataQueryable;
  address ownablePending;
  address prepay;
  address referrals;
  address tipping;
  address multiInit;

  // Test Facets
  address mockLegacyMembership;

  function versionName() public pure override returns (string memory) {
    return "space";
  }

  function addImmutableCuts(address deployer) internal {
    multiInit = deployMultiInit.deploy(deployer);
    diamondCut = diamondCutHelper.deploy(deployer);
    diamondLoupe = diamondLoupeHelper.deploy(deployer);
    introspection = introspectionHelper.deploy(deployer);
    ownablePending = ownablePendingHelper.deploy(deployer);
    tokenOwnable = tokenOwnableHelper.deploy(deployer);

    addCut(diamondCutHelper.makeCut(diamondCut, IDiamond.FacetCutAction.Add));
    addCut(
      diamondLoupeHelper.makeCut(diamondLoupe, IDiamond.FacetCutAction.Add)
    );
    addCut(
      introspectionHelper.makeCut(introspection, IDiamond.FacetCutAction.Add)
    );
    addCut(
      ownablePendingHelper.makeCut(ownablePending, IDiamond.FacetCutAction.Add)
    );
    addCut(
      tokenOwnableHelper.makeCut(tokenOwnable, IDiamond.FacetCutAction.Add)
    );

    addInit(diamondCut, diamondCutHelper.makeInitData(""));
    addInit(diamondLoupe, diamondLoupeHelper.makeInitData(""));
    addInit(introspection, introspectionHelper.makeInitData(""));
    addInit(ownablePending, ownablePendingHelper.makeInitData(deployer));
  }

  function diamondInitParams(
    address deployer
  ) public returns (Diamond.InitParams memory) {
    membershipToken = membershipTokenHelper.deploy(deployer);
    erc721aQueryable = erc721aQueryableHelper.deploy(deployer);
    banning = banningHelper.deploy(deployer);
    membership = membershipHelper.deploy(deployer);
    membershipMetadata = membershipMetadataHelper.deploy(deployer);
    entitlementDataQueryable = entitlementDataQueryableHelper.deploy(deployer);

    entitlements = entitlementsHelper.deploy(deployer);
    roles = rolesHelper.deploy(deployer);
    channels = channelsHelper.deploy(deployer);
    tokenPausable = tokenPausableHelper.deploy(deployer);
    prepay = prepayHelper.deploy(deployer);
    referrals = referralsHelper.deploy(deployer);
    entitlementGated = entitlementGatedHelper.deploy(deployer);
    tipping = tippingHelper.deploy(deployer);
    membershipTokenHelper.removeSelector(IERC721A.tokenURI.selector);

    if (isAnvil()) {
      mockLegacyMembership = mockLegacyMembershipHelper.deploy(deployer);
    }

    addCut(
      entitlementsHelper.makeCut(entitlements, IDiamond.FacetCutAction.Add)
    );
    addCut(rolesHelper.makeCut(roles, IDiamond.FacetCutAction.Add));
    addCut(
      tokenPausableHelper.makeCut(tokenPausable, IDiamond.FacetCutAction.Add)
    );
    addCut(channelsHelper.makeCut(channels, IDiamond.FacetCutAction.Add));
    addCut(
      membershipTokenHelper.makeCut(
        membershipToken,
        IDiamond.FacetCutAction.Add
      )
    );
    addCut(membershipHelper.makeCut(membership, IDiamond.FacetCutAction.Add));

    addCut(banningHelper.makeCut(banning, IDiamond.FacetCutAction.Add));
    addCut(
      membershipMetadataHelper.makeCut(
        membershipMetadata,
        IDiamond.FacetCutAction.Add
      )
    );
    addCut(
      entitlementGatedHelper.makeCut(
        entitlementGated,
        IDiamond.FacetCutAction.Add
      )
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
    addCut(prepayHelper.makeCut(prepay, IDiamond.FacetCutAction.Add));
    addCut(referralsHelper.makeCut(referrals, IDiamond.FacetCutAction.Add));
    addCut(tippingHelper.makeCut(tipping, IDiamond.FacetCutAction.Add));

    if (isAnvil()) {
      addCut(
        mockLegacyMembershipHelper.makeCut(
          mockLegacyMembership,
          IDiamond.FacetCutAction.Add
        )
      );
    }

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

  function diamondInitParamsFromFacets(
    address deployer,
    string[] memory facets
  ) public {
    for (uint256 i = 0; i < facets.length; i++) {
      bytes32 facetNameHash = keccak256(abi.encodePacked(facets[i]));

      if (facetNameHash == keccak256(abi.encodePacked("MembershipToken"))) {
        membershipToken = membershipTokenHelper.deploy(deployer);
        membershipTokenHelper.removeSelector(IERC721A.tokenURI.selector);
        addCut(
          membershipTokenHelper.makeCut(
            membershipToken,
            IDiamond.FacetCutAction.Add
          )
        );
      } else if (
        facetNameHash == keccak256(abi.encodePacked("ERC721AQueryable"))
      ) {
        erc721aQueryable = erc721aQueryableHelper.deploy(deployer);
        addCut(
          erc721aQueryableHelper.makeCut(
            erc721aQueryable,
            IDiamond.FacetCutAction.Add
          )
        );
      } else if (facetNameHash == keccak256(abi.encodePacked("Banning"))) {
        banning = banningHelper.deploy(deployer);
        addCut(banningHelper.makeCut(banning, IDiamond.FacetCutAction.Add));
      } else if (
        facetNameHash == keccak256(abi.encodePacked("MembershipFacet"))
      ) {
        membership = membershipHelper.deploy(deployer);
        addCut(
          membershipHelper.makeCut(membership, IDiamond.FacetCutAction.Add)
        );
      } else if (
        facetNameHash == keccak256(abi.encodePacked("MembershipMetadata"))
      ) {
        membershipMetadata = membershipMetadataHelper.deploy(deployer);
        addCut(
          membershipMetadataHelper.makeCut(
            membershipMetadata,
            IDiamond.FacetCutAction.Add
          )
        );
      } else if (
        facetNameHash == keccak256(abi.encodePacked("EntitlementDataQueryable"))
      ) {
        entitlementDataQueryable = entitlementDataQueryableHelper.deploy(
          deployer
        );
        addCut(
          entitlementDataQueryableHelper.makeCut(
            entitlementDataQueryable,
            IDiamond.FacetCutAction.Add
          )
        );
      } else if (
        facetNameHash == keccak256(abi.encodePacked("EntitlementsManager"))
      ) {
        entitlements = entitlementsHelper.deploy(deployer);
        addCut(
          entitlementsHelper.makeCut(entitlements, IDiamond.FacetCutAction.Add)
        );
      } else if (facetNameHash == keccak256(abi.encodePacked("Roles"))) {
        roles = rolesHelper.deploy(deployer);
        addCut(rolesHelper.makeCut(roles, IDiamond.FacetCutAction.Add));
      } else if (facetNameHash == keccak256(abi.encodePacked("Channels"))) {
        channels = channelsHelper.deploy(deployer);
        addCut(channelsHelper.makeCut(channels, IDiamond.FacetCutAction.Add));
      } else if (
        facetNameHash == keccak256(abi.encodePacked("TokenPausableFacet"))
      ) {
        tokenPausable = tokenPausableHelper.deploy(deployer);
        addCut(
          tokenPausableHelper.makeCut(
            tokenPausable,
            IDiamond.FacetCutAction.Add
          )
        );
      } else if (facetNameHash == keccak256(abi.encodePacked("PrepayFacet"))) {
        prepay = prepayHelper.deploy(deployer);
        addCut(prepayHelper.makeCut(prepay, IDiamond.FacetCutAction.Add));
      } else if (
        facetNameHash == keccak256(abi.encodePacked("ReferralsFacet"))
      ) {
        referrals = referralsHelper.deploy(deployer);
        addCut(referralsHelper.makeCut(referrals, IDiamond.FacetCutAction.Add));
      } else if (
        facetNameHash == keccak256(abi.encodePacked("SpaceEntitlementGated"))
      ) {
        entitlementGated = entitlementGatedHelper.deploy(deployer);
        addCut(
          entitlementGatedHelper.makeCut(
            entitlementGated,
            IDiamond.FacetCutAction.Add
          )
        );
      }
    }
  }

  function diamondInitHelper(
    address deployer,
    string[] memory facetNames
  ) external override returns (FacetCut[] memory) {
    diamondInitParamsFromFacets(deployer, facetNames);
    return this.getCuts();
  }

  function __deploy(address deployer) public override returns (address) {
    addImmutableCuts(deployer);

    Diamond.InitParams memory initDiamondCut = diamondInitParams(deployer);
    vm.broadcast(deployer);
    Diamond diamond = new Diamond(initDiamondCut);

    return address(diamond);
  }
}
