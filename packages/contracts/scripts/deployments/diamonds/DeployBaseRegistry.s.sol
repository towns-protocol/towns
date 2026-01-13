// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamondInitHelper} from "./IDiamondInitHelper.sol";

// libraries
import {DeployDiamondCut} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondCut.sol";
import {DeployDiamondLoupe} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondLoupe.sol";
import {DeployEIP712Facet} from "@towns-protocol/diamond/scripts/deployments/facets/DeployEIP712Facet.sol";
import {DeployIntrospection} from "@towns-protocol/diamond/scripts/deployments/facets/DeployIntrospection.sol";
import {DeployOwnable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployOwnable.sol";
import {LibString} from "solady/utils/LibString.sol";
import {DeployMetadata} from "../facets/DeployMetadata.s.sol";
import {DeployERC721ANonTransferable} from "../facets/DeployERC721ANonTransferable.s.sol";
import {DeployEntitlementChecker} from "../facets/DeployEntitlementChecker.s.sol";
import {DeployMainnetDelegation} from "../facets/DeployMainnetDelegation.s.sol";
import {DeployNodeOperator} from "../facets/DeployNodeOperator.s.sol";
import {DeployRewardsDistributionV2} from "../facets/DeployRewardsDistributionV2.s.sol";
import {DeploySpaceDelegation} from "../facets/DeploySpaceDelegation.s.sol";
import {DeployXChain} from "../facets/DeployXChain.s.sol";

// contracts
import {Diamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {MultiInit} from "@towns-protocol/diamond/src/initializers/MultiInit.sol";
import {DiamondHelper} from "@towns-protocol/diamond/scripts/common/helpers/DiamondHelper.s.sol";

// deployers
import {DeployFacet} from "../../common/DeployFacet.s.sol";
import {Deployer} from "../../common/Deployer.s.sol";
import {DeployMockMessenger} from "../utils/DeployMockMessenger.s.sol";
import {DeployTownsBase} from "../utils/DeployTownsBase.s.sol";

contract DeployBaseRegistry is IDiamondInitHelper, DiamondHelper, Deployer {
    using LibString for string;

    DeployFacet private facetHelper = new DeployFacet();
    DeployMockMessenger private messengerHelper = new DeployMockMessenger();
    DeployTownsBase internal townsHelper = new DeployTownsBase();

    address public messenger;

    function versionName() public pure override returns (string memory) {
        return "baseRegistry";
    }

    function addImmutableCuts(address deployer) internal {
        // Queue up all core facets for batch deployment
        facetHelper.add("DiamondCutFacet");
        facetHelper.add("DiamondLoupeFacet");
        facetHelper.add("IntrospectionFacet");
        facetHelper.add("OwnableFacet");

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

        facet = facetHelper.predictAddress("OwnableFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployOwnable.selectors()),
            facet,
            DeployOwnable.makeInitData(deployer)
        );
    }

    function diamondInitParams(address deployer) public returns (Diamond.InitParams memory) {
        // Queue up all feature facets for batch deployment
        facetHelper.add("MultiInit");
        facetHelper.add("ERC721ANonTransferable");
        facetHelper.add("NodeOperatorFacet");
        facetHelper.add("MetadataFacet");
        facetHelper.add("EntitlementChecker");
        facetHelper.add("RewardsDistributionV2");
        facetHelper.add("SpaceDelegationFacet");
        facetHelper.add("MainnetDelegation");
        facetHelper.add("EIP712Facet");
        facetHelper.add("XChain");

        // Deploy all facets
        facetHelper.deployBatch(deployer);

        // Deploy or retrieve the towns token
        address townsToken = townsHelper.deploy(deployer);

        // Add facets using the deployed addresses
        address facet = facetHelper.getDeployedAddress("ERC721ANonTransferable");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployERC721ANonTransferable.selectors()),
            facet,
            DeployERC721ANonTransferable.makeInitData("Operator", "OPR")
        );

        facet = facetHelper.getDeployedAddress("NodeOperatorFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployNodeOperator.selectors()),
            facet,
            DeployNodeOperator.makeInitData()
        );

        facet = facetHelper.getDeployedAddress("MetadataFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployMetadata.selectors()),
            facet,
            DeployMetadata.makeInitData(bytes32("SpaceOperator"), "")
        );

        facet = facetHelper.getDeployedAddress("EntitlementChecker");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployEntitlementChecker.selectors()),
            facet,
            DeployEntitlementChecker.makeInitData()
        );

        facet = facetHelper.getDeployedAddress("RewardsDistributionV2");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployRewardsDistributionV2.selectors()),
            facet,
            DeployRewardsDistributionV2.makeInitData(townsToken, townsToken, 14 days)
        );

        facet = facetHelper.getDeployedAddress("SpaceDelegationFacet");
        addCut(makeCut(facet, FacetCutAction.Add, DeploySpaceDelegation.selectors()));

        messenger = messengerHelper.deploy(deployer);
        facet = facetHelper.getDeployedAddress("MainnetDelegation");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployMainnetDelegation.selectors()),
            facet,
            DeployMainnetDelegation.makeInitData(messenger)
        );

        facet = facetHelper.getDeployedAddress("EIP712Facet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployEIP712Facet.selectors()),
            facet,
            DeployEIP712Facet.makeInitData("BaseRegistry", "1")
        );

        facet = facetHelper.getDeployedAddress("XChain");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployXChain.selectors()),
            facet,
            DeployXChain.makeInitData()
        );

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

        // Deploy or retrieve the towns token
        address townsToken = townsHelper.deploy(deployer);

        // Add the requested facets
        for (uint256 i; i < facets.length; ++i) {
            string memory facetName = facets[i];
            address facet = facetHelper.getDeployedAddress(facetName);

            if (facetName.eq("MetadataFacet")) {
                addFacet(
                    makeCut(facet, FacetCutAction.Add, DeployMetadata.selectors()),
                    facet,
                    DeployMetadata.makeInitData(bytes32("SpaceOperator"), "")
                );
            } else if (facetName.eq("EntitlementChecker")) {
                addFacet(
                    makeCut(facet, FacetCutAction.Add, DeployEntitlementChecker.selectors()),
                    facet,
                    DeployEntitlementChecker.makeInitData()
                );
            } else if (facetName.eq("NodeOperatorFacet")) {
                addFacet(
                    makeCut(facet, FacetCutAction.Add, DeployNodeOperator.selectors()),
                    facet,
                    DeployNodeOperator.makeInitData()
                );
            } else if (facetName.eq("RewardsDistributionV2")) {
                addFacet(
                    makeCut(facet, FacetCutAction.Add, DeployRewardsDistributionV2.selectors()),
                    facet,
                    DeployRewardsDistributionV2.makeInitData(townsToken, townsToken, 14 days)
                );
            } else if (facetName.eq("MainnetDelegation")) {
                messenger = messengerHelper.deploy(deployer);
                addFacet(
                    makeCut(facet, FacetCutAction.Add, DeployMainnetDelegation.selectors()),
                    facet,
                    DeployMainnetDelegation.makeInitData(messenger)
                );
            } else if (facetName.eq("SpaceDelegationFacet")) {
                addCut(makeCut(facet, FacetCutAction.Add, DeploySpaceDelegation.selectors()));
            } else if (facetName.eq("ERC721ANonTransferable")) {
                addFacet(
                    makeCut(facet, FacetCutAction.Add, DeployERC721ANonTransferable.selectors()),
                    facet,
                    DeployERC721ANonTransferable.makeInitData("Operator", "OPR")
                );
            } else if (facetName.eq("EIP712Facet")) {
                addFacet(
                    makeCut(facet, FacetCutAction.Add, DeployEIP712Facet.selectors()),
                    facet,
                    DeployEIP712Facet.makeInitData("BaseRegistry", "1")
                );
            } else if (facetName.eq("XChain")) {
                addFacet(
                    makeCut(facet, FacetCutAction.Add, DeployXChain.selectors()),
                    facet,
                    DeployXChain.makeInitData()
                );
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
