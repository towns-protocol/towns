// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {DeployDiamondCut} from
    "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from
    "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployEIP712Facet} from
    "@towns-protocol/diamond/scripts/deployments/facets/DeployEIP712Facet.s.sol";
import {DeployIntrospection} from
    "@towns-protocol/diamond/scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployOwnable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployOwnable.s.sol";

// contracts
import {Diamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {MultiInit} from "@towns-protocol/diamond/src/initializers/MultiInit.sol";
import {DiamondHelper} from "contracts/test/diamond/Diamond.t.sol";

// deployers
import {DeployFacet} from "../../common/DeployFacet.s.sol";
import {Deployer} from "../../common/Deployer.s.sol";
import {DeployERC721ANonTransferable} from
    "contracts/scripts/deployments/facets/DeployERC721ANonTransferable.s.sol";
import {DeployEntitlementChecker} from
    "contracts/scripts/deployments/facets/DeployEntitlementChecker.s.sol";
import {DeployMainnetDelegation} from
    "contracts/scripts/deployments/facets/DeployMainnetDelegation.s.sol";
import {DeployMetadata} from "contracts/scripts/deployments/facets/DeployMetadata.s.sol";
import {DeployMockMessenger} from "contracts/scripts/deployments/facets/DeployMockMessenger.s.sol";
import {DeployNodeOperator} from "contracts/scripts/deployments/facets/DeployNodeOperator.s.sol";
import {DeployRewardsDistributionV2} from
    "contracts/scripts/deployments/facets/DeployRewardsDistributionV2.s.sol";
import {DeploySpaceDelegation} from
    "contracts/scripts/deployments/facets/DeploySpaceDelegation.s.sol";
import {DeployXChain} from "contracts/scripts/deployments/facets/DeployXChain.s.sol";

contract DeployBaseRegistry is DiamondHelper, Deployer {
    DeployERC721ANonTransferable deployNFT = new DeployERC721ANonTransferable();

    // deployments
    DeployFacet private facetHelper = new DeployFacet();
    DeployMainnetDelegation mainnetDelegationHelper = new DeployMainnetDelegation();
    DeployEntitlementChecker checkerHelper = new DeployEntitlementChecker();
    DeployMetadata metadataHelper = new DeployMetadata();
    DeployNodeOperator operatorHelper = new DeployNodeOperator();
    DeploySpaceDelegation spaceDelegationHelper = new DeploySpaceDelegation();
    DeployRewardsDistributionV2 distributionV2Helper = new DeployRewardsDistributionV2();
    DeployMockMessenger messengerHelper = new DeployMockMessenger();
    DeployXChain xchainHelper = new DeployXChain();
    address multiInit;
    address diamondCut;
    address diamondLoupe;
    address introspection;
    address ownable;
    address metadata;
    address entitlementChecker;
    address operator;

    address nft;
    address eip712;
    address distribution;
    address distributionV2;
    address spaceDelegation;
    address mainnetDelegation;
    address xchain;
    address public messenger;

    address riverToken = 0x9172852305F32819469bf38A3772f29361d7b768;

    function versionName() public pure override returns (string memory) {
        return "baseRegistry";
    }

    function setDependencies(address riverToken_) external {
        riverToken = riverToken_;
    }

    function addImmutableCuts(address deployer) internal {
        multiInit = facetHelper.deploy("MultiInit", deployer);

        diamondCut = facetHelper.deploy("DiamondCutFacet", deployer);
        diamondLoupe = facetHelper.deploy("DiamondLoupeFacet", deployer);
        introspection = facetHelper.deploy("IntrospectionFacet", deployer);
        ownable = facetHelper.deploy("OwnableFacet", deployer);

        addFacet(
            DeployDiamondCut.makeCut(diamondCut, IDiamond.FacetCutAction.Add),
            diamondCut,
            DeployDiamondCut.makeInitData()
        );
        addFacet(
            DeployDiamondLoupe.makeCut(diamondLoupe, IDiamond.FacetCutAction.Add),
            diamondLoupe,
            DeployDiamondLoupe.makeInitData()
        );
        addFacet(
            DeployIntrospection.makeCut(introspection, IDiamond.FacetCutAction.Add),
            introspection,
            DeployIntrospection.makeInitData()
        );
        addFacet(
            DeployOwnable.makeCut(ownable, IDiamond.FacetCutAction.Add),
            ownable,
            DeployOwnable.makeInitData(deployer)
        );
    }

    function diamondInitParams(address deployer) public returns (Diamond.InitParams memory) {
        metadata = metadataHelper.deploy(deployer);
        entitlementChecker = checkerHelper.deploy(deployer);
        operator = operatorHelper.deploy(deployer);
        distributionV2 = distributionV2Helper.deploy(deployer);
        mainnetDelegation = mainnetDelegationHelper.deploy(deployer);
        spaceDelegation = spaceDelegationHelper.deploy(deployer);
        nft = deployNFT.deploy(deployer);
        messenger = messengerHelper.deploy(deployer);
        eip712 = facetHelper.deploy("EIP712Facet", deployer);
        xchain = xchainHelper.deploy(deployer);
        addFacet(
            deployNFT.makeCut(nft, IDiamond.FacetCutAction.Add),
            nft,
            deployNFT.makeInitData("Operator", "OPR")
        );
        addFacet(
            operatorHelper.makeCut(operator, IDiamond.FacetCutAction.Add),
            operator,
            operatorHelper.makeInitData("")
        );

        addFacet(
            metadataHelper.makeCut(metadata, IDiamond.FacetCutAction.Add),
            metadata,
            metadataHelper.makeInitData("SpaceOperator", "")
        );
        addFacet(
            checkerHelper.makeCut(entitlementChecker, IDiamond.FacetCutAction.Add),
            entitlementChecker,
            checkerHelper.makeInitData("")
        );

        addFacet(
            distributionV2Helper.makeCut(distributionV2, IDiamond.FacetCutAction.Add),
            distributionV2,
            distributionV2Helper.makeInitData(riverToken, riverToken, 14 days)
        );
        addFacet(
            spaceDelegationHelper.makeCut(spaceDelegation, IDiamond.FacetCutAction.Add),
            spaceDelegation,
            spaceDelegationHelper.makeInitData(riverToken)
        );
        addFacet(
            mainnetDelegationHelper.makeCut(mainnetDelegation, IDiamond.FacetCutAction.Add),
            mainnetDelegation,
            mainnetDelegationHelper.makeInitData(messenger)
        );
        addFacet(
            DeployEIP712Facet.makeCut(eip712, IDiamond.FacetCutAction.Add),
            eip712,
            DeployEIP712Facet.makeInitData("BaseRegistry", "1")
        );
        addFacet(
            xchainHelper.makeCut(xchain, IDiamond.FacetCutAction.Add),
            xchain,
            xchainHelper.makeInitData("")
        );

        return Diamond.InitParams({
            baseFacets: baseFacets(),
            init: multiInit,
            initData: abi.encodeWithSelector(MultiInit.multiInit.selector, _initAddresses, _initDatas)
        });
    }

    function diamondInitParamsFromFacets(address deployer, string[] memory facets) public {
        for (uint256 i = 0; i < facets.length; i++) {
            string memory facetName = facets[i];
            bytes32 facetNameHash = keccak256(abi.encodePacked(facetName));

            if (facetNameHash == keccak256(abi.encodePacked("MetadataFacet"))) {
                metadata = metadataHelper.deploy(deployer);
                addFacet(
                    metadataHelper.makeCut(metadata, IDiamond.FacetCutAction.Add),
                    metadata,
                    metadataHelper.makeInitData("SpaceOperator", "")
                );
            } else if (facetNameHash == keccak256(abi.encodePacked("EntitlementChecker"))) {
                entitlementChecker = checkerHelper.deploy(deployer);
                addFacet(
                    checkerHelper.makeCut(entitlementChecker, IDiamond.FacetCutAction.Add),
                    entitlementChecker,
                    checkerHelper.makeInitData("")
                );
            } else if (facetNameHash == keccak256(abi.encodePacked("NodeOperatorFacet"))) {
                operator = operatorHelper.deploy(deployer);
                addFacet(
                    operatorHelper.makeCut(operator, IDiamond.FacetCutAction.Add),
                    operator,
                    operatorHelper.makeInitData("")
                );
            } else if (facetNameHash == keccak256(abi.encodePacked("RewardsDistributionV2"))) {
                distributionV2 = distributionV2Helper.deploy(deployer);
                addFacet(
                    distributionV2Helper.makeCut(distributionV2, IDiamond.FacetCutAction.Add),
                    distributionV2,
                    distributionV2Helper.makeInitData("")
                );
            } else if (facetNameHash == keccak256(abi.encodePacked("MainnetDelegation"))) {
                mainnetDelegation = mainnetDelegationHelper.deploy(deployer);
                messenger = messengerHelper.deploy(deployer);
                addFacet(
                    mainnetDelegationHelper.makeCut(mainnetDelegation, IDiamond.FacetCutAction.Add),
                    mainnetDelegation,
                    mainnetDelegationHelper.makeInitData(messenger)
                );
            } else if (facetNameHash == keccak256(abi.encodePacked("SpaceDelegationFacet"))) {
                spaceDelegation = spaceDelegationHelper.deploy(deployer);
                addFacet(
                    spaceDelegationHelper.makeCut(spaceDelegation, IDiamond.FacetCutAction.Add),
                    spaceDelegation,
                    spaceDelegationHelper.makeInitData(riverToken)
                );
            } else if (facetNameHash == keccak256(abi.encodePacked("ERC721ANonTransferable"))) {
                nft = deployNFT.deploy(deployer);
                addFacet(
                    deployNFT.makeCut(nft, IDiamond.FacetCutAction.Add),
                    nft,
                    deployNFT.makeInitData("Operator", "OPR")
                );
            } else if (facetNameHash == keccak256(abi.encodePacked("EIP712Facet"))) {
                eip712 = facetHelper.deploy("EIP712Facet", deployer);
                addFacet(
                    DeployEIP712Facet.makeCut(eip712, IDiamond.FacetCutAction.Add),
                    eip712,
                    DeployEIP712Facet.makeInitData("BaseRegistry", "1")
                );
            }
        }
    }

    function diamondInitHelper(
        address deployer,
        string[] memory facetNames
    )
        external
        override
        returns (FacetCut[] memory)
    {
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
