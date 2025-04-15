// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";
import {IDiamondInitHelper} from "./IDiamondInitHelper.sol";

// libraries
import {DeployDiamondCut} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployIntrospection} from "@towns-protocol/diamond/scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployOwnablePending} from "@towns-protocol/diamond/scripts/deployments/facets/DeployOwnablePending.s.sol";
import {DeployTokenOwnable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployTokenOwnable.s.sol";
import {DeployTokenPausable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployTokenPausable.s.sol";
import {LibString} from "solady/utils/LibString.sol";
import {DeployBanning} from "../facets/DeployBanning.s.sol";
import {DeployChannels} from "../facets/DeployChannels.s.sol";
import {DeployERC721AQueryable} from "../facets/DeployERC721AQueryable.s.sol";
import {DeployEntitlementDataQueryable} from "../facets/DeployEntitlementDataQueryable.s.sol";
import {DeployEntitlementsManager} from "../facets/DeployEntitlementsManager.s.sol";
import {DeployMembership} from "../facets/DeployMembership.s.sol";
import {DeployMembershipMetadata} from "../facets/DeployMembershipMetadata.s.sol";
import {DeployMembershipToken} from "../facets/DeployMembershipToken.s.sol";
import {DeployPrepayFacet} from "../facets/DeployPrepayFacet.s.sol";
import {DeployReferrals} from "../facets/DeployReferrals.s.sol";
import {DeployReviewFacet} from "../facets/DeployReviewFacet.s.sol";
import {DeployRoles} from "../facets/DeployRoles.s.sol";
import {DeploySpaceEntitlementGated} from "../facets/DeploySpaceEntitlementGated.s.sol";
import {DeployTipping} from "../facets/DeployTipping.s.sol";
import {DeployTreasury} from "../facets/DeployTreasury.s.sol";

// contracts
import {Diamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {MultiInit} from "@towns-protocol/diamond/src/initializers/MultiInit.sol";
import {DiamondHelper} from "@towns-protocol/diamond/scripts/common/helpers/DiamondHelper.s.sol";

// deployers
import {DeployFacet} from "../../common/DeployFacet.s.sol";
import {Deployer} from "../../common/Deployer.s.sol";

// Test Facets
import {DeployMockLegacyMembership} from "scripts/deployments/utils/DeployMockLegacyMembership.s.sol";

contract DeploySpace is IDiamondInitHelper, DiamondHelper, Deployer {
    using LibString for string;

    DeployFacet private facetHelper = new DeployFacet();

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
        membershipToken = facetHelper.deploy("MembershipToken", deployer);
        erc721aQueryable = facetHelper.deploy("ERC721AQueryable", deployer);
        banning = facetHelper.deploy("Banning", deployer);
        membership = facetHelper.deploy("MembershipFacet", deployer);
        membershipMetadata = facetHelper.deploy("MembershipMetadata", deployer);
        entitlementDataQueryable = facetHelper.deploy("EntitlementDataQueryable", deployer);
        entitlements = facetHelper.deploy("EntitlementsManager", deployer);
        roles = facetHelper.deploy("Roles", deployer);
        channels = facetHelper.deploy("Channels", deployer);
        tokenPausable = facetHelper.deploy("TokenPausableFacet", deployer);
        prepay = facetHelper.deploy("PrepayFacet", deployer);
        referrals = facetHelper.deploy("ReferralsFacet", deployer);
        review = facetHelper.deploy("ReviewFacet", deployer);
        entitlementGated = facetHelper.deploy("SpaceEntitlementGated", deployer);
        tipping = facetHelper.deploy("TippingFacet", deployer);
        treasury = facetHelper.deploy("Treasury", deployer);

        if (isAnvil()) {
            mockLegacyMembership = facetHelper.deploy("MockLegacyMembership", deployer);
        }

        addCut(DeployEntitlementsManager.makeCut(entitlements, IDiamond.FacetCutAction.Add));
        addCut(DeployRoles.makeCut(roles, IDiamond.FacetCutAction.Add));
        addCut(DeployTokenPausable.makeCut(tokenPausable, IDiamond.FacetCutAction.Add));
        addCut(DeployChannels.makeCut(channels, IDiamond.FacetCutAction.Add));
        addCut(DeployMembershipToken.makeCut(membershipToken, IDiamond.FacetCutAction.Add));
        addCut(DeployMembership.makeCut(membership, IDiamond.FacetCutAction.Add));
        addCut(DeployBanning.makeCut(banning, IDiamond.FacetCutAction.Add));
        addCut(DeployMembershipMetadata.makeCut(membershipMetadata, IDiamond.FacetCutAction.Add));
        addCut(DeploySpaceEntitlementGated.makeCut(entitlementGated, IDiamond.FacetCutAction.Add));
        addCut(DeployERC721AQueryable.makeCut(erc721aQueryable, IDiamond.FacetCutAction.Add));
        addCut(
            DeployEntitlementDataQueryable.makeCut(
                entitlementDataQueryable,
                IDiamond.FacetCutAction.Add
            )
        );
        addCut(DeployPrepayFacet.makeCut(prepay, IDiamond.FacetCutAction.Add));
        addCut(DeployReferrals.makeCut(referrals, IDiamond.FacetCutAction.Add));
        addCut(DeployReviewFacet.makeCut(review, IDiamond.FacetCutAction.Add));
        addCut(DeployTipping.makeCut(tipping, IDiamond.FacetCutAction.Add));
        addCut(DeployTreasury.makeCut(treasury, IDiamond.FacetCutAction.Add));

        if (isAnvil()) {
            addCut(
                DeployMockLegacyMembership.makeCut(
                    mockLegacyMembership,
                    IDiamond.FacetCutAction.Add
                )
            );
        }

        return
            Diamond.InitParams({
                baseFacets: baseFacets(),
                init: multiInit,
                initData: abi.encodeCall(MultiInit.multiInit, (_initAddresses, _initDatas))
            });
    }

    function diamondInitParamsFromFacets(address deployer, string[] memory facets) public {
        for (uint256 i; i < facets.length; ++i) {
            string memory facetName = facets[i];

            if (facetName.eq("MembershipToken")) {
                membershipToken = facetHelper.deploy("MembershipToken", deployer);
                addCut(DeployMembershipToken.makeCut(membershipToken, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("ERC721AQueryable")) {
                erc721aQueryable = facetHelper.deploy("ERC721AQueryable", deployer);
                addCut(
                    DeployERC721AQueryable.makeCut(erc721aQueryable, IDiamond.FacetCutAction.Add)
                );
            } else if (facetName.eq("Banning")) {
                banning = facetHelper.deploy("Banning", deployer);
                addCut(DeployBanning.makeCut(banning, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("MembershipFacet")) {
                membership = facetHelper.deploy("MembershipFacet", deployer);
                addCut(DeployMembership.makeCut(membership, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("MembershipMetadata")) {
                membershipMetadata = facetHelper.deploy("MembershipMetadata", deployer);
                addCut(
                    DeployMembershipMetadata.makeCut(
                        membershipMetadata,
                        IDiamond.FacetCutAction.Add
                    )
                );
            } else if (facetName.eq("EntitlementDataQueryable")) {
                entitlementDataQueryable = facetHelper.deploy("EntitlementDataQueryable", deployer);
                addCut(
                    DeployEntitlementDataQueryable.makeCut(
                        entitlementDataQueryable,
                        IDiamond.FacetCutAction.Add
                    )
                );
            } else if (facetName.eq("EntitlementsManager")) {
                entitlements = facetHelper.deploy("EntitlementsManager", deployer);
                addCut(
                    DeployEntitlementsManager.makeCut(entitlements, IDiamond.FacetCutAction.Add)
                );
            } else if (facetName.eq("Roles")) {
                roles = facetHelper.deploy("Roles", deployer);
                addCut(DeployRoles.makeCut(roles, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("Channels")) {
                channels = facetHelper.deploy("Channels", deployer);
                addCut(DeployChannels.makeCut(channels, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("TokenPausableFacet")) {
                tokenPausable = facetHelper.deploy("TokenPausableFacet", deployer);
                addCut(DeployTokenPausable.makeCut(tokenPausable, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("PrepayFacet")) {
                prepay = facetHelper.deploy("PrepayFacet", deployer);
                addCut(DeployPrepayFacet.makeCut(prepay, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("ReferralsFacet")) {
                referrals = facetHelper.deploy("ReferralsFacet", deployer);
                addCut(DeployReferrals.makeCut(referrals, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("ReviewFacet")) {
                review = facetHelper.deploy("ReviewFacet", deployer);
                addCut(DeployReviewFacet.makeCut(review, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("SpaceEntitlementGated")) {
                entitlementGated = facetHelper.deploy("SpaceEntitlementGated", deployer);
                addCut(
                    DeploySpaceEntitlementGated.makeCut(
                        entitlementGated,
                        IDiamond.FacetCutAction.Add
                    )
                );
            } else if (facetName.eq("TippingFacet")) {
                tipping = facetHelper.deploy("TippingFacet", deployer);
                addCut(DeployTipping.makeCut(tipping, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("Treasury")) {
                treasury = facetHelper.deploy("Treasury", deployer);
                addCut(DeployTreasury.makeCut(treasury, IDiamond.FacetCutAction.Add));
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
