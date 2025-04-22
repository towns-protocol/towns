// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";
import {IDiamondInitHelper} from "./IDiamondInitHelper.sol";

// libraries
import {DeployDiamondCut} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployEIP712Facet} from "@towns-protocol/diamond/scripts/deployments/facets/DeployEIP712Facet.s.sol";
import {DeployIntrospection} from "@towns-protocol/diamond/scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployOwnable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployOwnable.s.sol";
import {LibString} from "solady/utils/LibString.sol";
import {DeployMetadata} from "../facets/DeployMetadata.s.sol";

// contracts
import {Diamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {MultiInit} from "@towns-protocol/diamond/src/initializers/MultiInit.sol";
import {DiamondHelper} from "@towns-protocol/diamond/scripts/common/helpers/DiamondHelper.s.sol";

// deployers
import {DeployFacet} from "../../common/DeployFacet.s.sol";
import {Deployer} from "../../common/Deployer.s.sol";
import {DeployERC721ANonTransferable} from "scripts/deployments/facets/DeployERC721ANonTransferable.s.sol";
import {DeployEntitlementChecker} from "scripts/deployments/facets/DeployEntitlementChecker.s.sol";
import {DeployMainnetDelegation} from "scripts/deployments/facets/DeployMainnetDelegation.s.sol";
import {DeployMockMessenger} from "scripts/deployments/facets/DeployMockMessenger.s.sol";
import {DeployNodeOperator} from "scripts/deployments/facets/DeployNodeOperator.s.sol";
import {DeployRewardsDistributionV2} from "scripts/deployments/facets/DeployRewardsDistributionV2.s.sol";
import {DeploySpaceDelegation} from "scripts/deployments/facets/DeploySpaceDelegation.s.sol";
import {DeployXChain} from "scripts/deployments/facets/DeployXChain.s.sol";

contract DeployBaseRegistry is IDiamondInitHelper, DiamondHelper, Deployer {
    using LibString for string;

    DeployFacet private facetHelper = new DeployFacet();
    DeployERC721ANonTransferable private deployNFT = new DeployERC721ANonTransferable();
    DeployMainnetDelegation private mainnetDelegationHelper = new DeployMainnetDelegation();
    DeployEntitlementChecker private checkerHelper = new DeployEntitlementChecker();
    DeployNodeOperator private operatorHelper = new DeployNodeOperator();
    DeploySpaceDelegation private spaceDelegationHelper = new DeploySpaceDelegation();
    DeployRewardsDistributionV2 private distributionV2Helper = new DeployRewardsDistributionV2();
    DeployMockMessenger private messengerHelper = new DeployMockMessenger();
    DeployXChain private xchainHelper = new DeployXChain();

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

        facet = facetHelper.deploy("OwnableFacet", deployer);
        addFacet(
            DeployOwnable.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployOwnable.makeInitData(deployer)
        );
    }

    function diamondInitParams(address deployer) public returns (Diamond.InitParams memory) {
        // deploy and add facets one by one to avoid stack too deep
        address facet = deployNFT.deploy(deployer);
        addFacet(
            deployNFT.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            deployNFT.makeInitData("Operator", "OPR")
        );

        facet = operatorHelper.deploy(deployer);
        addFacet(
            operatorHelper.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            operatorHelper.makeInitData("")
        );

        facet = facetHelper.deploy("MetadataFacet", deployer);
        addFacet(
            DeployMetadata.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployMetadata.makeInitData("SpaceOperator", "")
        );

        facet = checkerHelper.deploy(deployer);
        addFacet(
            checkerHelper.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            checkerHelper.makeInitData("")
        );

        facet = distributionV2Helper.deploy(deployer);
        addFacet(
            distributionV2Helper.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            distributionV2Helper.makeInitData(riverToken, riverToken, 14 days)
        );

        facet = spaceDelegationHelper.deploy(deployer);
        addFacet(
            spaceDelegationHelper.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            spaceDelegationHelper.makeInitData(riverToken)
        );

        messenger = messengerHelper.deploy(deployer);
        facet = mainnetDelegationHelper.deploy(deployer);
        addFacet(
            mainnetDelegationHelper.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            mainnetDelegationHelper.makeInitData(messenger)
        );

        facet = facetHelper.deploy("EIP712Facet", deployer);
        addFacet(
            DeployEIP712Facet.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployEIP712Facet.makeInitData("BaseRegistry", "1")
        );

        facet = xchainHelper.deploy(deployer);
        addFacet(
            xchainHelper.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            xchainHelper.makeInitData("")
        );

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

            if (facetName.eq("MetadataFacet")) {
                facet = facetHelper.deploy("MetadataFacet", deployer);
                addFacet(
                    DeployMetadata.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployMetadata.makeInitData("SpaceOperator", "")
                );
            } else if (facetName.eq("EntitlementChecker")) {
                facet = checkerHelper.deploy(deployer);
                addFacet(
                    checkerHelper.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    checkerHelper.makeInitData("")
                );
            } else if (facetName.eq("NodeOperatorFacet")) {
                facet = operatorHelper.deploy(deployer);
                addFacet(
                    operatorHelper.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    operatorHelper.makeInitData("")
                );
            } else if (facetName.eq("RewardsDistributionV2")) {
                facet = distributionV2Helper.deploy(deployer);
                addFacet(
                    distributionV2Helper.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    distributionV2Helper.makeInitData("")
                );
            } else if (facetName.eq("MainnetDelegation")) {
                facet = mainnetDelegationHelper.deploy(deployer);
                messenger = messengerHelper.deploy(deployer);
                addFacet(
                    mainnetDelegationHelper.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    mainnetDelegationHelper.makeInitData(messenger)
                );
            } else if (facetName.eq("SpaceDelegationFacet")) {
                facet = spaceDelegationHelper.deploy(deployer);
                addFacet(
                    spaceDelegationHelper.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    spaceDelegationHelper.makeInitData(riverToken)
                );
            } else if (facetName.eq("ERC721ANonTransferable")) {
                facet = deployNFT.deploy(deployer);
                addFacet(
                    deployNFT.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    deployNFT.makeInitData("Operator", "OPR")
                );
            } else if (facetName.eq("EIP712Facet")) {
                facet = facetHelper.deploy("EIP712Facet", deployer);
                addFacet(
                    DeployEIP712Facet.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployEIP712Facet.makeInitData("BaseRegistry", "1")
                );
            } else if (facetName.eq("XChain")) {
                facet = xchainHelper.deploy(deployer);
                addFacet(
                    xchainHelper.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    xchainHelper.makeInitData("")
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

    function __deploy(address deployer) internal override returns (address) {
        addImmutableCuts(deployer);

        Diamond.InitParams memory initDiamondCut = diamondInitParams(deployer);

        vm.broadcast(deployer);
        Diamond diamond = new Diamond(initDiamondCut);
        return address(diamond);
    }
}
