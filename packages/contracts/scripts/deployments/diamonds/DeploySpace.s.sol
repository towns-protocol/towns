// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";
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
import {DeployPrepayFacet} from "../facets/DeployPrepayFacet.s.sol";
import {DeployReferrals} from "../facets/DeployReferrals.s.sol";
import {DeployReviewFacet} from "../facets/DeployReviewFacet.s.sol";
import {DeployRoles} from "../facets/DeployRoles.s.sol";
import {DeploySpaceEntitlementGated} from "../facets/DeploySpaceEntitlementGated.s.sol";
import {DeploySwapFacet} from "../facets/DeploySwapFacet.s.sol";
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

    address private multiInit;

    function versionName() public pure override returns (string memory) {
        return "space";
    }

    function addImmutableCuts(address deployer) internal {
        // Queue up all core facets for batch deployment
        facetHelper.add("MultiInit");
        facetHelper.add("DiamondCutFacet");
        facetHelper.add("DiamondLoupeFacet");
        facetHelper.add("IntrospectionFacet");
        facetHelper.add("OwnablePendingFacet");
        facetHelper.add("TokenOwnableFacet");

        // Get predicted addresses
        multiInit = facetHelper.predictAddress("MultiInit");

        address facet = facetHelper.predictAddress("DiamondCutFacet");
        addFacet(
            DeployDiamondCut.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployDiamondCut.makeInitData()
        );

        facet = facetHelper.predictAddress("DiamondLoupeFacet");
        addFacet(
            DeployDiamondLoupe.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployDiamondLoupe.makeInitData()
        );

        facet = facetHelper.predictAddress("IntrospectionFacet");
        addFacet(
            DeployIntrospection.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployIntrospection.makeInitData()
        );

        facet = facetHelper.predictAddress("OwnablePendingFacet");
        addFacet(
            DeployOwnablePending.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployOwnablePending.makeInitData(deployer)
        );

        facet = facetHelper.predictAddress("TokenOwnableFacet");
        addCut(DeployTokenOwnable.makeCut(facet, IDiamond.FacetCutAction.Add));
    }

    function diamondInitParams(address deployer) public returns (Diamond.InitParams memory) {
        // Queue up all feature facets for batch deployment
        facetHelper.add("MembershipToken");
        facetHelper.add("ERC721AQueryable");
        facetHelper.add("Banning");
        facetHelper.add("MembershipFacet");
        facetHelper.add("MembershipMetadata");
        facetHelper.add("EntitlementDataQueryable");
        facetHelper.add("EntitlementsManager");

        // Deploy the first batch of facets
        facetHelper.deployBatch(deployer);

        facetHelper.add("Roles");
        facetHelper.add("Channels");
        facetHelper.add("TokenPausableFacet");
        facetHelper.add("PrepayFacet");
        facetHelper.add("ReferralsFacet");
        facetHelper.add("ReviewFacet");
        facetHelper.add("SpaceEntitlementGated");
        facetHelper.add("SwapFacet");
        facetHelper.add("TippingFacet");
        facetHelper.add("Treasury");

        if (isAnvil()) {
            facetHelper.add("MockLegacyMembership");
        }

        // Deploy the second batch of facets
        facetHelper.deployBatch(deployer);

        // deploy and add facets one by one to avoid stack too deep
        address facet = facetHelper.getDeployedAddress("MembershipToken");
        addCut(DeployMembershipToken.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.getDeployedAddress("ERC721AQueryable");
        addCut(DeployERC721AQueryable.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.getDeployedAddress("Banning");
        addCut(DeployBanning.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.getDeployedAddress("MembershipFacet");
        addCut(DeployMembership.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.getDeployedAddress("MembershipMetadata");
        addCut(DeployMembershipMetadata.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.getDeployedAddress("EntitlementDataQueryable");
        addCut(DeployEntitlementDataQueryable.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.getDeployedAddress("EntitlementsManager");
        addCut(DeployEntitlementsManager.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.getDeployedAddress("Roles");
        addCut(DeployRoles.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.getDeployedAddress("Channels");
        addCut(DeployChannels.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.getDeployedAddress("TokenPausableFacet");
        addCut(DeployTokenPausable.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.getDeployedAddress("PrepayFacet");
        addCut(DeployPrepayFacet.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.getDeployedAddress("ReferralsFacet");
        addCut(DeployReferrals.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.getDeployedAddress("ReviewFacet");
        addCut(DeployReviewFacet.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.getDeployedAddress("SpaceEntitlementGated");
        addCut(DeploySpaceEntitlementGated.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.getDeployedAddress("SwapFacet");
        addCut(DeploySwapFacet.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.getDeployedAddress("TippingFacet");
        addCut(DeployTipping.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.getDeployedAddress("Treasury");
        addCut(DeployTreasury.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.deploy("ModularAccount", deployer);
        addCut(DeployModularAccount.makeCut(facet, IDiamond.FacetCutAction.Add));

        if (isAnvil()) {
            facet = facetHelper.getDeployedAddress("MockLegacyMembership");
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
        // Queue up all requested facets for batch deployment
        for (uint256 i; i < facets.length; ++i) {
            facetHelper.add(facets[i]);
        }

        // Deploy all requested facets in a single batch transaction
        facetHelper.deployBatch(deployer);

        address facet;
        for (uint256 i; i < facets.length; ++i) {
            string memory facetName = facets[i];
            facet = facetHelper.getDeployedAddress(facetName);

            if (facetName.eq("MembershipToken")) {
                addCut(DeployMembershipToken.makeCut(facet, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("ERC721AQueryable")) {
                addCut(DeployERC721AQueryable.makeCut(facet, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("Banning")) {
                addCut(DeployBanning.makeCut(facet, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("MembershipFacet")) {
                addCut(DeployMembership.makeCut(facet, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("MembershipMetadata")) {
                addCut(DeployMembershipMetadata.makeCut(facet, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("EntitlementDataQueryable")) {
                addCut(DeployEntitlementDataQueryable.makeCut(facet, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("EntitlementsManager")) {
                addCut(DeployEntitlementsManager.makeCut(facet, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("Roles")) {
                addCut(DeployRoles.makeCut(facet, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("Channels")) {
                addCut(DeployChannels.makeCut(facet, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("TokenPausableFacet")) {
                addCut(DeployTokenPausable.makeCut(facet, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("PrepayFacet")) {
                addCut(DeployPrepayFacet.makeCut(facet, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("ReferralsFacet")) {
                addCut(DeployReferrals.makeCut(facet, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("ReviewFacet")) {
                addCut(DeployReviewFacet.makeCut(facet, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("SpaceEntitlementGated")) {
                addCut(DeploySpaceEntitlementGated.makeCut(facet, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("SwapFacet")) {
                addCut(DeploySwapFacet.makeCut(facet, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("TippingFacet")) {
                addCut(DeployTipping.makeCut(facet, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("Treasury")) {
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
