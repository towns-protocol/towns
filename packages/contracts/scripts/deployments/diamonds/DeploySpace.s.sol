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
import {DeployModularAccount} from "../facets/DeployModularAccount.s.sol";
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
    address modularAccount;

    // Test Facets
    address mockLegacyMembership;

    function versionName() public pure override returns (string memory) {
        return "space";
    }

    function addImmutableCuts(address deployer) internal {
        multiInit = facetHelper.deploy("MultiInit", deployer);

        address facet = facetHelper.deploy("DiamondCutFacet", deployer);
        addFacet(
            DeployDiamondCut.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployDiamondCut.makeInitData()
        );

        facet = facetHelper.deploy("DiamondLoupeFacet", deployer);
        addFacet(
            DeployDiamondLoupe.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployDiamondLoupe.makeInitData()
        );

        facet = facetHelper.deploy("IntrospectionFacet", deployer);
        addFacet(
            DeployIntrospection.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployIntrospection.makeInitData()
        );

        facet = facetHelper.deploy("OwnablePendingFacet", deployer);
        addFacet(
            DeployOwnablePending.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployOwnablePending.makeInitData(deployer)
        );

        facet = facetHelper.deploy("TokenOwnableFacet", deployer);
        addCut(DeployTokenOwnable.makeCut(facet, IDiamond.FacetCutAction.Add));
    }

    function diamondInitParams(address deployer) public returns (Diamond.InitParams memory) {
        // deploy and add facets one by one to avoid stack too deep
        address facet = facetHelper.deploy("MembershipToken", deployer);
        addCut(DeployMembershipToken.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.deploy("ERC721AQueryable", deployer);
        addCut(DeployERC721AQueryable.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.deploy("Banning", deployer);
        addCut(DeployBanning.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.deploy("MembershipFacet", deployer);
        addCut(DeployMembership.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.deploy("MembershipMetadata", deployer);
        addCut(DeployMembershipMetadata.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.deploy("EntitlementDataQueryable", deployer);
        addCut(DeployEntitlementDataQueryable.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.deploy("EntitlementsManager", deployer);
        addCut(DeployEntitlementsManager.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.deploy("Roles", deployer);
        addCut(DeployRoles.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.deploy("Channels", deployer);
        addCut(DeployChannels.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.deploy("TokenPausableFacet", deployer);
        addCut(DeployTokenPausable.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.deploy("PrepayFacet", deployer);
        addCut(DeployPrepayFacet.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.deploy("ReferralsFacet", deployer);
        addCut(DeployReferrals.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.deploy("ReviewFacet", deployer);
        addCut(DeployReviewFacet.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.deploy("SpaceEntitlementGated", deployer);
        addCut(DeploySpaceEntitlementGated.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.deploy("TippingFacet", deployer);
        addCut(DeployTipping.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.deploy("Treasury", deployer);
        addCut(DeployTreasury.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.deploy("ModularAccount", deployer);
        addCut(DeployModularAccount.makeCut(facet, IDiamond.FacetCutAction.Add));

        if (isAnvil()) {
            facet = facetHelper.deploy("MockLegacyMembership", deployer);
            addCut(DeployMockLegacyMembership.makeCut(facet, IDiamond.FacetCutAction.Add));
        }

        return
            Diamond.InitParams({
                baseFacets: baseFacets(),
                init: multiInit,
                initData: abi.encodeCall(MultiInit.multiInit, (_initAddresses, _initDatas))
            });
    }

    function diamondInitParamsFromFacets(address deployer, string[] memory facets) public {
        address facet;
        for (uint256 i; i < facets.length; ++i) {
            string memory facetName = facets[i];

            if (facetName.eq("MembershipToken")) {
                facet = facetHelper.deploy("MembershipToken", deployer);
                addCut(DeployMembershipToken.makeCut(facet, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("ERC721AQueryable")) {
                facet = facetHelper.deploy("ERC721AQueryable", deployer);
                addCut(DeployERC721AQueryable.makeCut(facet, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("Banning")) {
                facet = facetHelper.deploy("Banning", deployer);
                addCut(DeployBanning.makeCut(facet, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("MembershipFacet")) {
                facet = facetHelper.deploy("MembershipFacet", deployer);
                addCut(DeployMembership.makeCut(facet, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("MembershipMetadata")) {
                facet = facetHelper.deploy("MembershipMetadata", deployer);
                addCut(DeployMembershipMetadata.makeCut(facet, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("EntitlementDataQueryable")) {
                facet = facetHelper.deploy("EntitlementDataQueryable", deployer);
                addCut(DeployEntitlementDataQueryable.makeCut(facet, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("EntitlementsManager")) {
                facet = facetHelper.deploy("EntitlementsManager", deployer);
                addCut(DeployEntitlementsManager.makeCut(facet, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("Roles")) {
                facet = facetHelper.deploy("Roles", deployer);
                addCut(DeployRoles.makeCut(facet, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("Channels")) {
                facet = facetHelper.deploy("Channels", deployer);
                addCut(DeployChannels.makeCut(facet, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("TokenPausableFacet")) {
                facet = facetHelper.deploy("TokenPausableFacet", deployer);
                addCut(DeployTokenPausable.makeCut(facet, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("PrepayFacet")) {
                facet = facetHelper.deploy("PrepayFacet", deployer);
                addCut(DeployPrepayFacet.makeCut(facet, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("ReferralsFacet")) {
                facet = facetHelper.deploy("ReferralsFacet", deployer);
                addCut(DeployReferrals.makeCut(facet, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("ReviewFacet")) {
                facet = facetHelper.deploy("ReviewFacet", deployer);
                addCut(DeployReviewFacet.makeCut(facet, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("SpaceEntitlementGated")) {
                facet = facetHelper.deploy("SpaceEntitlementGated", deployer);
                addCut(DeploySpaceEntitlementGated.makeCut(facet, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("TippingFacet")) {
                facet = facetHelper.deploy("TippingFacet", deployer);
                addCut(DeployTipping.makeCut(facet, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("Treasury")) {
                facet = facetHelper.deploy("Treasury", deployer);
                addCut(DeployTreasury.makeCut(facet, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("ModularAccount")) {
                facet = facetHelper.deploy("ModularAccount", deployer);
                addCut(DeployModularAccount.makeCut(facet, IDiamond.FacetCutAction.Add));
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
