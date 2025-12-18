// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamondInitHelper} from "./IDiamondInitHelper.sol";

// libraries
import {DeployDiamondCut} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondCut.sol";
import {DeployDiamondLoupe} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondLoupe.sol";
import {DeployIntrospection} from "@towns-protocol/diamond/scripts/deployments/facets/DeployIntrospection.sol";
import {DeployOwnablePending} from "@towns-protocol/diamond/scripts/deployments/facets/DeployOwnablePending.sol";
import {DeployTokenOwnable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployTokenOwnable.sol";
import {DeployTokenPausable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployTokenPausable.sol";
import {LibString} from "solady/utils/LibString.sol";
import {DeployBanning} from "../facets/DeployBanning.s.sol";
import {DeployChannels} from "../facets/DeployChannels.s.sol";
import {DeployERC721AQueryable} from "../facets/DeployERC721AQueryable.s.sol";
import {DeployEntitlementDataQueryable} from "../facets/DeployEntitlementDataQueryable.s.sol";
import {DeployEntitlementsManager} from "../facets/DeployEntitlementsManager.s.sol";
import {DeployMembership} from "../facets/DeployMembership.s.sol";
import {DeployMembershipMetadata} from "../facets/DeployMembershipMetadata.s.sol";
import {DeployMembershipToken} from "../facets/DeployMembershipToken.s.sol";
import {DeployReferrals} from "../facets/DeployReferrals.s.sol";
import {DeployReviewFacet} from "../facets/DeployReviewFacet.s.sol";
import {DeployRoles} from "../facets/DeployRoles.s.sol";
import {DeploySpaceEntitlementGated} from "../facets/DeploySpaceEntitlementGated.s.sol";
import {DeploySwapFacet} from "../facets/DeploySwapFacet.s.sol";
import {DeployTipping} from "../facets/DeployTipping.s.sol";
import {DeployTreasury} from "../facets/DeployTreasury.s.sol";
import {DeployAppAccount} from "../facets/DeployAppAccount.s.sol";
import {DeploySignerFacet} from "../facets/DeploySignerFacet.s.sol";

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

    function versionName() public pure override returns (string memory) {
        return "space";
    }

    function addImmutableCuts(address deployer) internal {
        // Queue up all core facets for batch deployment
        facetHelper.add("DiamondCutFacet");
        facetHelper.add("DiamondLoupeFacet");
        facetHelper.add("IntrospectionFacet");
        facetHelper.add("OwnablePendingFacet");
        facetHelper.add("TokenOwnableFacet");

        // Get predicted addresses
        address facet = facetHelper.predictAddress("DiamondCutFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployDiamondCut.selectors()),
            facet,
            DeployDiamondCut.makeInitData()
        );

        facet = facetHelper.predictAddress("DiamondLoupeFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployDiamondLoupe.selectors()),
            facet,
            DeployDiamondLoupe.makeInitData()
        );

        facet = facetHelper.predictAddress("IntrospectionFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployIntrospection.selectors()),
            facet,
            DeployIntrospection.makeInitData()
        );

        facet = facetHelper.predictAddress("OwnablePendingFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployOwnablePending.selectors()),
            facet,
            DeployOwnablePending.makeInitData(deployer)
        );

        facet = facetHelper.predictAddress("TokenOwnableFacet");
        // TokenOwnableFacet doesn't require global initialization during deployment.
        // Unlike other facets with immediate initialization, TokenOwnableFacet is initialized
        // individually for each Space instance at creation time rather than globally.
        addCut(makeCut(facet, FacetCutAction.Add, DeployTokenOwnable.selectors()));
    }

    function diamondInitParams(address deployer) public returns (Diamond.InitParams memory) {
        // Queue up all feature facets for batch deployment
        facetHelper.add("MultiInit");
        facetHelper.add("MembershipToken");
        facetHelper.add("ERC721AQueryable");
        facetHelper.add("Banning");
        facetHelper.add("MembershipFacet");
        facetHelper.add("MembershipMetadata");
        facetHelper.add("EntitlementDataQueryable");

        // Deploy the first batch of facets
        facetHelper.deployBatch(deployer);

        facetHelper.add("EntitlementsManager");
        facetHelper.add("Roles");
        facetHelper.add("Channels");
        facetHelper.add("TokenPausableFacet");
        facetHelper.add("ReferralsFacet");
        facetHelper.add("ReviewFacet");

        // Deploy the second batch of facets
        facetHelper.deployBatch(deployer);

        facetHelper.add("SpaceEntitlementGated");
        facetHelper.add("SwapFacet");
        facetHelper.add("TippingFacet");
        facetHelper.add("Treasury");
        facetHelper.add("AppAccount");
        facetHelper.add("SignerFacet");

        if (isAnvil()) {
            facetHelper.add("MockLegacyMembership");
        }

        // Deploy the third batch of facets
        facetHelper.deployBatch(deployer);

        // deploy and add facets one by one to avoid stack too deep
        address facet = facetHelper.getDeployedAddress("MembershipToken");
        addCut(makeCut(facet, FacetCutAction.Add, DeployMembershipToken.selectorsExceptTokenURI()));

        facet = facetHelper.getDeployedAddress("ERC721AQueryable");
        addCut(makeCut(facet, FacetCutAction.Add, DeployERC721AQueryable.selectors()));

        facet = facetHelper.getDeployedAddress("Banning");
        addCut(makeCut(facet, FacetCutAction.Add, DeployBanning.selectors()));

        facet = facetHelper.getDeployedAddress("MembershipFacet");
        addCut(makeCut(facet, FacetCutAction.Add, DeployMembership.selectors()));

        facet = facetHelper.getDeployedAddress("MembershipMetadata");
        addCut(makeCut(facet, FacetCutAction.Add, DeployMembershipMetadata.selectors()));

        facet = facetHelper.getDeployedAddress("EntitlementDataQueryable");
        addCut(makeCut(facet, FacetCutAction.Add, DeployEntitlementDataQueryable.selectors()));

        facet = facetHelper.getDeployedAddress("EntitlementsManager");
        addCut(makeCut(facet, FacetCutAction.Add, DeployEntitlementsManager.selectors()));

        facet = facetHelper.getDeployedAddress("Roles");
        addCut(makeCut(facet, FacetCutAction.Add, DeployRoles.selectors()));

        facet = facetHelper.getDeployedAddress("Channels");
        addCut(makeCut(facet, FacetCutAction.Add, DeployChannels.selectors()));

        facet = facetHelper.getDeployedAddress("TokenPausableFacet");
        addCut(makeCut(facet, FacetCutAction.Add, DeployTokenPausable.selectors()));

        facet = facetHelper.getDeployedAddress("ReferralsFacet");
        addCut(makeCut(facet, FacetCutAction.Add, DeployReferrals.selectors()));

        facet = facetHelper.getDeployedAddress("ReviewFacet");
        addCut(makeCut(facet, FacetCutAction.Add, DeployReviewFacet.selectors()));

        facet = facetHelper.getDeployedAddress("SpaceEntitlementGated");
        addCut(makeCut(facet, FacetCutAction.Add, DeploySpaceEntitlementGated.selectors()));

        facet = facetHelper.getDeployedAddress("SwapFacet");
        addCut(makeCut(facet, FacetCutAction.Add, DeploySwapFacet.selectors()));

        facet = facetHelper.getDeployedAddress("TippingFacet");
        addCut(makeCut(facet, FacetCutAction.Add, DeployTipping.selectors()));

        facet = facetHelper.getDeployedAddress("Treasury");
        addCut(makeCut(facet, FacetCutAction.Add, DeployTreasury.selectors()));

        facet = facetHelper.getDeployedAddress("AppAccount");
        addCut(makeCut(facet, FacetCutAction.Add, DeployAppAccount.selectors()));

        facet = facetHelper.getDeployedAddress("SignerFacet");
        addCut(makeCut(facet, FacetCutAction.Add, DeploySignerFacet.selectors()));

        if (isAnvil()) {
            facet = facetHelper.getDeployedAddress("MockLegacyMembership");
            addCut(makeCut(facet, FacetCutAction.Add, DeployMockLegacyMembership.selectors()));
        }

        address multiInit = facetHelper.getDeployedAddress("MultiInit");

        return
            Diamond.InitParams({
                baseFacets: baseFacets(),
                init: multiInit,
                initData: abi.encodeCall(MultiInit.multiInit, (_initAddresses, _initDatas))
            });
    }

    function diamondInitParamsFromFacets(address deployer, string[] memory facets) public {
        // Queue up all requested facets for batch deployment
        for (uint256 i; i < facets.length; ++i) {
            facetHelper.add(facets[i]);
        }

        // Deploy all requested facets in a single batch transaction
        facetHelper.deployBatch(deployer);

        for (uint256 i; i < facets.length; ++i) {
            string memory facetName = facets[i];
            address facet = facetHelper.getDeployedAddress(facetName);

            if (facetName.eq("MembershipToken")) {
                addCut(
                    makeCut(
                        facet,
                        FacetCutAction.Add,
                        DeployMembershipToken.selectorsExceptTokenURI()
                    )
                );
            } else if (facetName.eq("ERC721AQueryable")) {
                addCut(makeCut(facet, FacetCutAction.Add, DeployERC721AQueryable.selectors()));
            } else if (facetName.eq("Banning")) {
                addCut(makeCut(facet, FacetCutAction.Add, DeployBanning.selectors()));
            } else if (facetName.eq("MembershipFacet")) {
                addCut(makeCut(facet, FacetCutAction.Add, DeployMembership.selectors()));
            } else if (facetName.eq("MembershipMetadata")) {
                addCut(makeCut(facet, FacetCutAction.Add, DeployMembershipMetadata.selectors()));
            } else if (facetName.eq("EntitlementDataQueryable")) {
                addCut(
                    makeCut(facet, FacetCutAction.Add, DeployEntitlementDataQueryable.selectors())
                );
            } else if (facetName.eq("EntitlementsManager")) {
                addCut(makeCut(facet, FacetCutAction.Add, DeployEntitlementsManager.selectors()));
            } else if (facetName.eq("Roles")) {
                addCut(makeCut(facet, FacetCutAction.Add, DeployRoles.selectors()));
            } else if (facetName.eq("Channels")) {
                addCut(makeCut(facet, FacetCutAction.Add, DeployChannels.selectors()));
            } else if (facetName.eq("TokenPausableFacet")) {
                addCut(makeCut(facet, FacetCutAction.Add, DeployTokenPausable.selectors()));
            } else if (facetName.eq("ReferralsFacet")) {
                addCut(makeCut(facet, FacetCutAction.Add, DeployReferrals.selectors()));
            } else if (facetName.eq("ReviewFacet")) {
                addCut(makeCut(facet, FacetCutAction.Add, DeployReviewFacet.selectors()));
            } else if (facetName.eq("SpaceEntitlementGated")) {
                addCut(makeCut(facet, FacetCutAction.Add, DeploySpaceEntitlementGated.selectors()));
            } else if (facetName.eq("SwapFacet")) {
                addCut(makeCut(facet, FacetCutAction.Add, DeploySwapFacet.selectors()));
            } else if (facetName.eq("TippingFacet")) {
                addCut(makeCut(facet, FacetCutAction.Add, DeployTipping.selectors()));
            } else if (facetName.eq("Treasury")) {
                addCut(makeCut(facet, FacetCutAction.Add, DeployTreasury.selectors()));
            } else if (facetName.eq("AppAccount")) {
                addCut(makeCut(facet, FacetCutAction.Add, DeployAppAccount.selectors()));
            } else if (facetName.eq("SignerFacet")) {
                addCut(makeCut(facet, FacetCutAction.Add, DeploySignerFacet.selectors()));
            }
        }
    }

    function diamondInitHelper(
        address deployer,
        string[] memory facetNames
    ) external override returns (FacetCut[] memory) {
        diamondInitParamsFromFacets(deployer, facetNames);
        return baseFacets();
    }

    function __deploy(address deployer) internal override returns (address) {
        addImmutableCuts(deployer);

        Diamond.InitParams memory initDiamondCut = diamondInitParams(deployer);
        vm.broadcast(deployer);
        Diamond diamond = new Diamond(initDiamondCut);

        return address(diamond);
    }
}
