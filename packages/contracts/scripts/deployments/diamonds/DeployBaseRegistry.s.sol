// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";
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

contract DeployBaseRegistry is IDiamondInitHelper, DiamondHelper, Deployer {
    using LibString for string;

    DeployFacet private facetHelper = new DeployFacet();
    DeployMockMessenger private messengerHelper = new DeployMockMessenger();

    address private multiInit;
    address public messenger;
    address private riverToken = 0x9172852305F32819469bf38A3772f29361d7b768;

    function versionName() public pure override returns (string memory) {
        return "baseRegistry";
    }

    function setDependencies(address riverToken_) external {
        riverToken = riverToken_;
    }

    function addImmutableCuts(address deployer) internal {
        // Queue up all core facets for batch deployment
        facetHelper.add("MultiInit");
        facetHelper.add("DiamondCutFacet");
        facetHelper.add("DiamondLoupeFacet");
        facetHelper.add("IntrospectionFacet");
        facetHelper.add("OwnableFacet");

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

        facet = facetHelper.predictAddress("OwnableFacet");
        addFacet(
            DeployOwnable.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployOwnable.makeInitData(deployer)
        );
    }

    function diamondInitParams(address deployer) public returns (Diamond.InitParams memory) {
        // Queue up all feature facets for batch deployment
        facetHelper.add("ERC721ANonTransferable");
        facetHelper.add("NodeOperatorFacet");
        facetHelper.add("MetadataFacet");
        facetHelper.add("EntitlementChecker");
        facetHelper.add("RewardsDistributionV2");
        facetHelper.add("SpaceDelegationFacet");
        facetHelper.add("MainnetDelegation");
        facetHelper.add("EIP712Facet");
        facetHelper.add("XChain");

        // Deploy all facets in a single batch transaction
        facetHelper.deployBatch(deployer);

        // Add facets using the deployed addresses
        address facet = facetHelper.getDeployedAddress("ERC721ANonTransferable");
        addFacet(
            DeployERC721ANonTransferable.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployERC721ANonTransferable.makeInitData("Operator", "OPR")
        );

        facet = facetHelper.getDeployedAddress("NodeOperatorFacet");
        addFacet(
            DeployNodeOperator.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployNodeOperator.makeInitData()
        );

        facet = facetHelper.getDeployedAddress("MetadataFacet");
        addFacet(
            DeployMetadata.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployMetadata.makeInitData(bytes32("SpaceOperator"), "")
        );

        facet = facetHelper.getDeployedAddress("EntitlementChecker");
        addFacet(
            DeployEntitlementChecker.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployEntitlementChecker.makeInitData()
        );

        facet = facetHelper.getDeployedAddress("RewardsDistributionV2");
        addFacet(
            DeployRewardsDistributionV2.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployRewardsDistributionV2.makeInitData(riverToken, riverToken, 14 days)
        );

        facet = facetHelper.getDeployedAddress("SpaceDelegationFacet");
        addFacet(
            DeploySpaceDelegation.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeploySpaceDelegation.makeInitData(riverToken)
        );

        messenger = messengerHelper.deploy(deployer);
        facet = facetHelper.getDeployedAddress("MainnetDelegation");
        addFacet(
            DeployMainnetDelegation.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployMainnetDelegation.makeInitData(messenger)
        );

        facet = facetHelper.getDeployedAddress("EIP712Facet");
        addFacet(
            DeployEIP712Facet.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployEIP712Facet.makeInitData("BaseRegistry", "1")
        );

        facet = facetHelper.getDeployedAddress("XChain");
        addFacet(
            DeployXChain.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployXChain.makeInitData()
        );

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

        // Add the requested facets
        for (uint256 i; i < facets.length; ++i) {
            string memory facetName = facets[i];
            address facet = facetHelper.getDeployedAddress(facetName);

            if (facetName.eq("MetadataFacet")) {
                addFacet(
                    DeployMetadata.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployMetadata.makeInitData(bytes32("SpaceOperator"), "")
                );
            } else if (facetName.eq("EntitlementChecker")) {
                addFacet(
                    DeployEntitlementChecker.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployEntitlementChecker.makeInitData()
                );
            } else if (facetName.eq("NodeOperatorFacet")) {
                addFacet(
                    DeployNodeOperator.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployNodeOperator.makeInitData()
                );
            } else if (facetName.eq("RewardsDistributionV2")) {
                addFacet(
                    DeployRewardsDistributionV2.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployRewardsDistributionV2.makeInitData(riverToken, riverToken, 14 days)
                );
            } else if (facetName.eq("MainnetDelegation")) {
                messenger = messengerHelper.deploy(deployer);
                addFacet(
                    DeployMainnetDelegation.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployMainnetDelegation.makeInitData(messenger)
                );
            } else if (facetName.eq("SpaceDelegationFacet")) {
                addFacet(
                    DeploySpaceDelegation.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeploySpaceDelegation.makeInitData(riverToken)
                );
            } else if (facetName.eq("ERC721ANonTransferable")) {
                addFacet(
                    DeployERC721ANonTransferable.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployERC721ANonTransferable.makeInitData("Operator", "OPR")
                );
            } else if (facetName.eq("EIP712Facet")) {
                addFacet(
                    DeployEIP712Facet.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployEIP712Facet.makeInitData("BaseRegistry", "1")
                );
            } else if (facetName.eq("XChain")) {
                addFacet(
                    DeployXChain.makeCut(facet, IDiamond.FacetCutAction.Add),
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
