// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";
import {IDiamondInitHelper} from "./IDiamondInitHelper.sol";

// libraries
import {DeployDiamondCut} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondCut.sol";
import {DeployDiamondLoupe} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondLoupe.sol";
import {DeployIntrospection} from "@towns-protocol/diamond/scripts/deployments/facets/DeployIntrospection.sol";
import {DeployOwnable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployOwnable.sol";
import {DeployPausable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployPausable.sol";
import {DeployMetadata} from "../facets/DeployMetadata.s.sol";
import {DeploySwapRouterFacet} from "../facets/DeploySwapRouterFacet.s.sol";
import {LibString} from "solady/utils/LibString.sol";

// contracts
import {Diamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {MultiInit} from "@towns-protocol/diamond/src/initializers/MultiInit.sol";
import {DiamondHelper} from "@towns-protocol/diamond/scripts/common/helpers/DiamondHelper.s.sol";

// deployers
import {DeployFacet} from "../../common/DeployFacet.s.sol";
import {Deployer} from "../../common/Deployer.s.sol";

contract DeploySwapRouter is IDiamondInitHelper, DiamondHelper, Deployer {
    using LibString for string;

    DeployFacet private facetHelper = new DeployFacet();
    address private multiInit;
    address private spaceFactory;

    function versionName() public pure override returns (string memory) {
        return "swapRouter";
    }

    function setDependencies(address spaceFactory_) external {
        spaceFactory = spaceFactory_;
    }

    function getSpaceFactory() internal returns (address) {
        if (spaceFactory != address(0)) return spaceFactory;
        return getDeployment("spaceFactory");
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
        // Queue additional facets for batch deployment
        facetHelper.add("SwapRouter");
        facetHelper.add("MetadataFacet");
        facetHelper.add("PausableFacet");

        // Deploy all queued facets in a single batch transaction
        facetHelper.deployBatch(deployer);

        // Add each facet to the diamond cut using its deployment library
        address facet = facetHelper.getDeployedAddress("SwapRouter");
        addFacet(
            DeploySwapRouterFacet.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeploySwapRouterFacet.makeInitData(getSpaceFactory())
        );

        facet = facetHelper.getDeployedAddress("MetadataFacet");
        addFacet(
            DeployMetadata.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployMetadata.makeInitData(bytes32("SwapRouter"), "")
        );

        facet = facetHelper.getDeployedAddress("PausableFacet");
        addFacet(
            DeployPausable.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployPausable.makeInitData()
        );

        return
            Diamond.InitParams({
                baseFacets: baseFacets(),
                init: multiInit,
                initData: abi.encodeCall(MultiInit.multiInit, (_initAddresses, _initDatas))
            });
    }

    function diamondInitParamsFromFacets(address deployer, string[] memory facetNames) public {
        // Queue requested facets for batch deployment
        for (uint256 i; i < facetNames.length; ++i) {
            facetHelper.add(facetNames[i]);
        }

        // Deploy all requested facets in a single batch transaction
        facetHelper.deployBatch(deployer);

        for (uint256 i; i < facetNames.length; ++i) {
            string memory facetName = facetNames[i];
            address facet = facetHelper.getDeployedAddress(facetName);

            if (facetName.eq("SwapRouter")) {
                addFacet(
                    DeploySwapRouterFacet.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeploySwapRouterFacet.makeInitData(getSpaceFactory())
                );
            } else if (facetName.eq("MetadataFacet")) {
                addFacet(
                    DeployMetadata.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployMetadata.makeInitData(bytes32("SwapRouter"), "")
                );
            } else if (facetName.eq("PausableFacet")) {
                addFacet(
                    DeployPausable.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployPausable.makeInitData()
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
