// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {Diamond, IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {IERC721A} from "src/diamond/facets/token/ERC721A/IERC721A.sol";

//libraries

//contracts
import {Deployer} from "scripts/common/Deployer.s.sol";
import {DiamondHelper} from "test/diamond/Diamond.t.sol";

// Facets
import {MultiInit} from "@towns-protocol/diamond/src/initializers/MultiInit.sol";
import {DeployBanning} from "scripts/deployments/facets/DeployBanning.s.sol";
import {DeployChannels} from "scripts/deployments/facets/DeployChannels.s.sol";
import {DeployDiamondCut} from "scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployERC721AQueryable} from "scripts/deployments/facets/DeployERC721AQueryable.s.sol";
import {DeployEntitlementDataQueryable} from "scripts/deployments/facets/DeployEntitlementDataQueryable.s.sol";
import {DeployEntitlementsManager} from "scripts/deployments/facets/DeployEntitlementsManager.s.sol";
import {DeployIntrospection} from "scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployMembership} from "scripts/deployments/facets/DeployMembership.s.sol";
import {DeployMembershipMetadata} from "scripts/deployments/facets/DeployMembershipMetadata.s.sol";
import {DeployMembershipToken} from "scripts/deployments/facets/DeployMembershipToken.s.sol";
import {DeployOwnablePendingFacet} from "scripts/deployments/facets/DeployOwnablePendingFacet.s.sol";
import {DeployPrepayFacet} from "scripts/deployments/facets/DeployPrepayFacet.s.sol";
import {DeployReferrals} from "scripts/deployments/facets/DeployReferrals.s.sol";
import {DeployReviewFacet} from "scripts/deployments/facets/DeployReviewFacet.s.sol";
import {DeployRoles} from "scripts/deployments/facets/DeployRoles.s.sol";
import {DeploySpaceEntitlementGated} from "scripts/deployments/facets/DeploySpaceEntitlementGated.s.sol";
import {DeployTipping} from "scripts/deployments/facets/DeployTipping.s.sol";
import {DeployTokenOwnable} from "scripts/deployments/facets/DeployTokenOwnable.s.sol";
import {DeployTokenPausable} from "scripts/deployments/facets/DeployTokenPausable.s.sol";
import {DeployTreasury} from "scripts/deployments/facets/DeployTreasury.s.sol";
import {DeployMultiInit} from "scripts/deployments/utils/DeployMultiInit.s.sol";
// Test Facets
import {DeployMockLegacyMembership} from "scripts/deployments/utils/DeployMockLegacyMembership.s.sol";

contract DeploySpace is DiamondHelper, Deployer {
    DeployDiamondCut diamondCutHelper = new DeployDiamondCut();
    DeployDiamondLoupe diamondLoupeHelper = new DeployDiamondLoupe();
    DeployIntrospection introspectionHelper = new DeployIntrospection();
    DeployERC721AQueryable erc721aQueryableHelper = new DeployERC721AQueryable();
    DeployBanning banningHelper = new DeployBanning();
    DeployMembership membershipHelper = new DeployMembership();
    DeployMembershipMetadata membershipMetadataHelper = new DeployMembershipMetadata();
    DeployEntitlementDataQueryable entitlementDataQueryableHelper =
        new DeployEntitlementDataQueryable();
    DeployOwnablePendingFacet ownablePendingHelper = new DeployOwnablePendingFacet();
    DeployTokenOwnable tokenOwnableHelper = new DeployTokenOwnable();
    DeployEntitlementsManager entitlementsHelper = new DeployEntitlementsManager();

    DeployRoles rolesHelper = new DeployRoles();
    DeployChannels channelsHelper = new DeployChannels();
    DeployTokenPausable tokenPausableHelper = new DeployTokenPausable();

    DeployPrepayFacet prepayHelper = new DeployPrepayFacet();
    DeployReferrals referralsHelper = new DeployReferrals();
    DeployReviewFacet reviewHelper = new DeployReviewFacet();
    DeployMembershipToken membershipTokenHelper = new DeployMembershipToken();
    DeploySpaceEntitlementGated entitlementGatedHelper = new DeploySpaceEntitlementGated();
    DeployMultiInit deployMultiInit = new DeployMultiInit();
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
        multiInit = deployMultiInit.deploy(deployer);
        diamondCut = diamondCutHelper.deploy(deployer);
        diamondLoupe = diamondLoupeHelper.deploy(deployer);
        introspection = introspectionHelper.deploy(deployer);
        ownablePending = ownablePendingHelper.deploy(deployer);
        tokenOwnable = tokenOwnableHelper.deploy(deployer);

        addCut(diamondCutHelper.makeCut(diamondCut, IDiamond.FacetCutAction.Add));
        addCut(diamondLoupeHelper.makeCut(diamondLoupe, IDiamond.FacetCutAction.Add));
        addCut(introspectionHelper.makeCut(introspection, IDiamond.FacetCutAction.Add));
        addCut(ownablePendingHelper.makeCut(ownablePending, IDiamond.FacetCutAction.Add));
        addCut(tokenOwnableHelper.makeCut(tokenOwnable, IDiamond.FacetCutAction.Add));

        addInit(diamondCut, diamondCutHelper.makeInitData(""));
        addInit(diamondLoupe, diamondLoupeHelper.makeInitData(""));
        addInit(introspection, introspectionHelper.makeInitData(""));
        addInit(ownablePending, ownablePendingHelper.makeInitData(deployer));
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
        tokenPausable = tokenPausableHelper.deploy(deployer);
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
        addCut(tokenPausableHelper.makeCut(tokenPausable, IDiamond.FacetCutAction.Add));
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
                tokenPausable = tokenPausableHelper.deploy(deployer);
                addCut(tokenPausableHelper.makeCut(tokenPausable, IDiamond.FacetCutAction.Add));
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
