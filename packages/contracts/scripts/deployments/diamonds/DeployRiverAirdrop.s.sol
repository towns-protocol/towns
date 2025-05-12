// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";
import {IDiamondInitHelper} from "./IDiamondInitHelper.sol";

// libraries
import {DeployDiamondCut} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondCut.sol";
import {DeployDiamondLoupe} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondLoupe.sol";
import {DeployIntrospection} from "@towns-protocol/diamond/scripts/deployments/facets/DeployIntrospection.sol";
import {DeployOwnable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployOwnable.sol";
import {DeployMetadata} from "../facets/DeployMetadata.s.sol";
import {DeployDropFacet} from "../facets/DeployDropFacet.s.sol";
import {DeployTownsPoints} from "../facets/DeployTownsPoints.s.sol";
import {LibString} from "solady/utils/LibString.sol";

// contracts
import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {Diamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {MultiInit} from "@towns-protocol/diamond/src/initializers/MultiInit.sol";
import {DiamondHelper} from "@towns-protocol/diamond/scripts/common/helpers/DiamondHelper.s.sol";

// deployers
import {DeployFacet} from "../../common/DeployFacet.s.sol";
import {Deployer} from "../../common/Deployer.s.sol";

contract DeployRiverAirdrop is IDiamondInitHelper, DiamondHelper, Deployer {
    using LibString for string;

    address private BASE_REGISTRY;
    address private SPACE_FACTORY;

    DeployFacet private facetHelper = new DeployFacet();
    address private multiInit;

    function versionName() public pure override returns (string memory) {
        return "riverAirdrop";
    }

    function setSpaceFactory(address spaceFactory) external {
        SPACE_FACTORY = spaceFactory;
    }

    function getSpaceFactory() internal returns (address) {
        if (SPACE_FACTORY != address(0)) {
            return SPACE_FACTORY;
        }

        return getDeployment("spaceFactory");
    }

    function setBaseRegistry(address baseRegistry) external {
        BASE_REGISTRY = baseRegistry;
    }

    function getBaseRegistry() internal returns (address) {
        if (BASE_REGISTRY != address(0)) {
            return BASE_REGISTRY;
        }

        return getDeployment("baseRegistry");
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
        // Queue up all facets for batch deployment
        facetHelper.add("DropFacet");
        facetHelper.add("TownsPoints");
        facetHelper.add("MetadataFacet");

        // Deploy the batch of facets
        facetHelper.deployBatch(deployer);

        // Get deployed addresses and add facets
        address facet = facetHelper.getDeployedAddress("DropFacet");
        addFacet(
            DeployDropFacet.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployDropFacet.makeInitData(getBaseRegistry())
        );

        facet = facetHelper.getDeployedAddress("TownsPoints");
        addFacet(
            DeployTownsPoints.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployTownsPoints.makeInitData(getSpaceFactory())
        );

        facet = facetHelper.getDeployedAddress("MetadataFacet");
        addFacet(
            DeployMetadata.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployMetadata.makeInitData(bytes32("RiverAirdrop"), "")
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

        for (uint256 i; i < facets.length; ++i) {
            string memory facetName = facets[i];
            address facet = facetHelper.getDeployedAddress(facetName);

            if (facetName.eq("DropFacet")) {
                addFacet(
                    DeployDropFacet.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployDropFacet.makeInitData(getBaseRegistry())
                );
            } else if (facetName.eq("TownsPoints")) {
                addFacet(
                    DeployTownsPoints.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployTownsPoints.makeInitData(getSpaceFactory())
                );
            } else if (facetName.eq("MetadataFacet")) {
                addFacet(
                    DeployMetadata.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployMetadata.makeInitData(bytes32("RiverAirdrop"), "")
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
