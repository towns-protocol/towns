// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {Diamond, IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {IERC721A} from "contracts/src/diamond/facets/token/ERC721A/IERC721A.sol";

// libraries
import {DeployDiamondCut} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployIntrospection} from "@towns-protocol/diamond/scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployOwnablePending} from "@towns-protocol/diamond/scripts/deployments/facets/DeployOwnablePending.s.sol";
import {DeployTokenOwnable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployTokenOwnable.s.sol";
import {DeployTokenPausable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployTokenPausable.s.sol";

// contracts
import {Diamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {MultiInit} from "@towns-protocol/diamond/src/initializers/MultiInit.sol";
import {DiamondHelper} from "contracts/test/diamond/Diamond.t.sol";

// deployers
import {DeployFacet} from "../../common/DeployFacet.s.sol";
import {Deployer} from "../../common/Deployer.s.sol";
import {DeployBanning} from "contracts/scripts/deployments/facets/DeployBanning.s.sol";
import {DeployChannels} from "contracts/scripts/deployments/facets/DeployChannels.s.sol";
import {DeployERC721AQueryable} from "contracts/scripts/deployments/facets/DeployERC721AQueryable.s.sol";
import {DeployEntitlementDataQueryable} from "contracts/scripts/deployments/facets/DeployEntitlementDataQueryable.s.sol";
import {DeployEntitlementsManager} from "contracts/scripts/deployments/facets/DeployEntitlementsManager.s.sol";
import {DeployMembership} from "contracts/scripts/deployments/facets/DeployMembership.s.sol";
import {DeployMembershipMetadata} from "contracts/scripts/deployments/facets/DeployMembershipMetadata.s.sol";
import {DeployMembershipToken} from "contracts/scripts/deployments/facets/DeployMembershipToken.s.sol";
import {DeployPrepayFacet} from "contracts/scripts/deployments/facets/DeployPrepayFacet.s.sol";
import {DeployReferrals} from "contracts/scripts/deployments/facets/DeployReferrals.s.sol";
import {DeployReviewFacet} from "contracts/scripts/deployments/facets/DeployReviewFacet.s.sol";
import {DeployRoles} from "contracts/scripts/deployments/facets/DeployRoles.s.sol";
import {DeploySpaceEntitlementGated} from "contracts/scripts/deployments/facets/DeploySpaceEntitlementGated.s.sol";
import {DeployTipping} from "contracts/scripts/deployments/facets/DeployTipping.s.sol";
import {DeployTreasury} from "contracts/scripts/deployments/facets/DeployTreasury.s.sol";

// Test Facets
import {DeployMockLegacyMembership} from "contracts/scripts/deployments/utils/DeployMockLegacyMembership.s.sol";

contract DeploySpace is DiamondHelper, Deployer {
    DeployFacet private facetHelper = new DeployFacet();
    DeployERC721AQueryable erc721aQueryableHelper = new DeployERC721AQueryable();
    DeployBanning banningHelper = new DeployBanning();
    DeployMembership membershipHelper = new DeployMembership();
    DeployMembershipMetadata membershipMetadataHelper = new DeployMembershipMetadata();
    DeployEntitlementDataQueryable entitlementDataQueryableHelper =
        new DeployEntitlementDataQueryable();
    DeployEntitlementsManager entitlementsHelper = new DeployEntitlementsManager();

    DeployRoles rolesHelper = new DeployRoles();
    DeployChannels channelsHelper = new DeployChannels();

    DeployPrepayFacet prepayHelper = new DeployPrepayFacet();
    DeployReferrals referralsHelper = new DeployReferrals();
    DeployReviewFacet reviewHelper = new DeployReviewFacet();
    DeployMembershipToken membershipTokenHelper = new DeployMembershipToken();
    DeploySpaceEntitlementGated entitlementGatedHelper = new DeploySpaceEntitlementGated();
    DeployTipping tippingHelper = new DeployTipping();
    DeployTreasury treasuryHelper = new DeployTreasury();
    // Test Facets
    DeployMockLegacyMembership mockLegacyMembershipHelper = new DeployMockLegacyMembership();

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
    address review;
    address tipping;
    address multiInit;
    address treasury;

    // Test Facets
    address mockLegacyMembership;

    function versionName() public pure override returns (string memory) {
        return "space";
    }

    function addImmutableCuts(address deployer) internal {
        multiInit = facetHelper.deploy("MultiInit", deployer);
        diamondCut = facetHelper.deploy("DiamondCutFacet", deployer);
        diamondLoupe = facetHelper.deploy("DiamondLoupeFacet", deployer);
        introspection = facetHelper.deploy("IntrospectionFacet", deployer);
        ownablePending = facetHelper.deploy("OwnablePendingFacet", deployer);
        tokenOwnable = facetHelper.deploy("TokenOwnableFacet", deployer);

        addCut(DeployDiamondCut.makeCut(diamondCut, IDiamond.FacetCutAction.Add));
        addCut(DeployDiamondLoupe.makeCut(diamondLoupe, IDiamond.FacetCutAction.Add));
        addCut(DeployIntrospection.makeCut(introspection, IDiamond.FacetCutAction.Add));
        addCut(DeployOwnablePending.makeCut(ownablePending, IDiamond.FacetCutAction.Add));
        addCut(DeployTokenOwnable.makeCut(tokenOwnable, IDiamond.FacetCutAction.Add));

        addInit(diamondCut, DeployDiamondCut.makeInitData());
        addInit(diamondLoupe, DeployDiamondLoupe.makeInitData());
        addInit(introspection, DeployIntrospection.makeInitData());
        addInit(ownablePending, DeployOwnablePending.makeInitData(deployer));
    }

    function diamondInitParams(address deployer) public returns (Diamond.InitParams memory) {
        membershipToken = membershipTokenHelper.deploy(deployer);
        erc721aQueryable = erc721aQueryableHelper.deploy(deployer);
        banning = banningHelper.deploy(deployer);
        membership = membershipHelper.deploy(deployer);
        membershipMetadata = membershipMetadataHelper.deploy(deployer);
        entitlementDataQueryable = entitlementDataQueryableHelper.deploy(deployer);
        entitlements = entitlementsHelper.deploy(deployer);
        roles = rolesHelper.deploy(deployer);
        channels = channelsHelper.deploy(deployer);
        tokenPausable = facetHelper.deploy("TokenPausableFacet", deployer);
        prepay = prepayHelper.deploy(deployer);
        referrals = referralsHelper.deploy(deployer);
        review = reviewHelper.deploy(deployer);
        entitlementGated = entitlementGatedHelper.deploy(deployer);
        tipping = tippingHelper.deploy(deployer);
        treasury = treasuryHelper.deploy(deployer);

        membershipTokenHelper.removeSelector(IERC721A.tokenURI.selector);

        if (isAnvil()) {
            mockLegacyMembership = mockLegacyMembershipHelper.deploy(deployer);
        }

        addCut(entitlementsHelper.makeCut(entitlements, IDiamond.FacetCutAction.Add));
        addCut(rolesHelper.makeCut(roles, IDiamond.FacetCutAction.Add));
        addCut(DeployTokenPausable.makeCut(tokenPausable, IDiamond.FacetCutAction.Add));
        addCut(channelsHelper.makeCut(channels, IDiamond.FacetCutAction.Add));
        addCut(membershipTokenHelper.makeCut(membershipToken, IDiamond.FacetCutAction.Add));
        addCut(membershipHelper.makeCut(membership, IDiamond.FacetCutAction.Add));
        addCut(banningHelper.makeCut(banning, IDiamond.FacetCutAction.Add));
        addCut(membershipMetadataHelper.makeCut(membershipMetadata, IDiamond.FacetCutAction.Add));
        addCut(entitlementGatedHelper.makeCut(entitlementGated, IDiamond.FacetCutAction.Add));
        addCut(erc721aQueryableHelper.makeCut(erc721aQueryable, IDiamond.FacetCutAction.Add));
        addCut(
            entitlementDataQueryableHelper.makeCut(
                entitlementDataQueryable,
                IDiamond.FacetCutAction.Add
            )
        );
        addCut(prepayHelper.makeCut(prepay, IDiamond.FacetCutAction.Add));
        addCut(referralsHelper.makeCut(referrals, IDiamond.FacetCutAction.Add));
        addCut(reviewHelper.makeCut(review, IDiamond.FacetCutAction.Add));
        addCut(tippingHelper.makeCut(tipping, IDiamond.FacetCutAction.Add));
        addCut(treasuryHelper.makeCut(treasury, IDiamond.FacetCutAction.Add));

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

    function diamondInitParamsFromFacets(address deployer, string[] memory facets) public {
        for (uint256 i = 0; i < facets.length; i++) {
            bytes32 facetNameHash = keccak256(abi.encodePacked(facets[i]));

            if (facetNameHash == keccak256(abi.encodePacked("MembershipToken"))) {
                membershipToken = membershipTokenHelper.deploy(deployer);
                membershipTokenHelper.removeSelector(IERC721A.tokenURI.selector);
                addCut(membershipTokenHelper.makeCut(membershipToken, IDiamond.FacetCutAction.Add));
            } else if (facetNameHash == keccak256(abi.encodePacked("ERC721AQueryable"))) {
                erc721aQueryable = erc721aQueryableHelper.deploy(deployer);
                addCut(
                    erc721aQueryableHelper.makeCut(erc721aQueryable, IDiamond.FacetCutAction.Add)
                );
            } else if (facetNameHash == keccak256(abi.encodePacked("Banning"))) {
                banning = banningHelper.deploy(deployer);
                addCut(banningHelper.makeCut(banning, IDiamond.FacetCutAction.Add));
            } else if (facetNameHash == keccak256(abi.encodePacked("MembershipFacet"))) {
                membership = membershipHelper.deploy(deployer);
                addCut(membershipHelper.makeCut(membership, IDiamond.FacetCutAction.Add));
            } else if (facetNameHash == keccak256(abi.encodePacked("MembershipMetadata"))) {
                membershipMetadata = membershipMetadataHelper.deploy(deployer);
                addCut(
                    membershipMetadataHelper.makeCut(
                        membershipMetadata,
                        IDiamond.FacetCutAction.Add
                    )
                );
            } else if (facetNameHash == keccak256(abi.encodePacked("EntitlementDataQueryable"))) {
                entitlementDataQueryable = entitlementDataQueryableHelper.deploy(deployer);
                addCut(
                    entitlementDataQueryableHelper.makeCut(
                        entitlementDataQueryable,
                        IDiamond.FacetCutAction.Add
                    )
                );
            } else if (facetNameHash == keccak256(abi.encodePacked("EntitlementsManager"))) {
                entitlements = entitlementsHelper.deploy(deployer);
                addCut(entitlementsHelper.makeCut(entitlements, IDiamond.FacetCutAction.Add));
            } else if (facetNameHash == keccak256(abi.encodePacked("Roles"))) {
                roles = rolesHelper.deploy(deployer);
                addCut(rolesHelper.makeCut(roles, IDiamond.FacetCutAction.Add));
            } else if (facetNameHash == keccak256(abi.encodePacked("Channels"))) {
                channels = channelsHelper.deploy(deployer);
                addCut(channelsHelper.makeCut(channels, IDiamond.FacetCutAction.Add));
            } else if (facetNameHash == keccak256(abi.encodePacked("TokenPausableFacet"))) {
                tokenPausable = facetHelper.deploy("TokenPausableFacet", deployer);
                addCut(DeployTokenPausable.makeCut(tokenPausable, IDiamond.FacetCutAction.Add));
            } else if (facetNameHash == keccak256(abi.encodePacked("PrepayFacet"))) {
                prepay = prepayHelper.deploy(deployer);
                addCut(prepayHelper.makeCut(prepay, IDiamond.FacetCutAction.Add));
            } else if (facetNameHash == keccak256(abi.encodePacked("ReferralsFacet"))) {
                referrals = referralsHelper.deploy(deployer);
                addCut(referralsHelper.makeCut(referrals, IDiamond.FacetCutAction.Add));
            } else if (facetNameHash == keccak256(abi.encodePacked("ReviewFacet"))) {
                review = reviewHelper.deploy(deployer);
                addCut(reviewHelper.makeCut(review, IDiamond.FacetCutAction.Add));
            } else if (facetNameHash == keccak256(abi.encodePacked("SpaceEntitlementGated"))) {
                entitlementGated = entitlementGatedHelper.deploy(deployer);
                addCut(
                    entitlementGatedHelper.makeCut(entitlementGated, IDiamond.FacetCutAction.Add)
                );
            } else if (facetNameHash == keccak256(abi.encodePacked("Treasury"))) {
                treasury = treasuryHelper.deploy(deployer);
                addCut(treasuryHelper.makeCut(treasury, IDiamond.FacetCutAction.Add));
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

    function __deploy(address deployer) internal override returns (address) {
        addImmutableCuts(deployer);

        Diamond.InitParams memory initDiamondCut = diamondInitParams(deployer);
        vm.broadcast(deployer);
        Diamond diamond = new Diamond(initDiamondCut);

        return address(diamond);
    }
}
