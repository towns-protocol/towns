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
import {LibString} from "solady/utils/LibString.sol";
import {DeployNodeRegistry} from "../facets/DeployNodeRegistry.s.sol";
import {DeployOperatorRegistry} from "../facets/DeployOperatorRegistry.s.sol";
import {DeployRiverConfig} from "../facets/DeployRiverConfig.s.sol";
import {DeployStreamRegistry} from "../facets/DeployStreamRegistry.s.sol";

// contracts
import {Diamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {MultiInit} from "@towns-protocol/diamond/src/initializers/MultiInit.sol";
import {DiamondHelper} from "@towns-protocol/diamond/scripts/common/helpers/DiamondHelper.s.sol";

// deployers
import {DeployFacet} from "../../common/DeployFacet.s.sol";
import {Deployer} from "../../common/Deployer.s.sol";

contract DeployRiverRegistry is IDiamondInitHelper, DiamondHelper, Deployer {
    using LibString for string;

    DeployFacet private facetHelper = new DeployFacet();
    address private multiInit;

    function versionName() public pure override returns (string memory) {
        return "riverRegistry";
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
        facetHelper.add("OperatorRegistry");
        facetHelper.add("RiverConfig");
        facetHelper.add("NodeRegistry");
        facetHelper.add("StreamRegistry");

        // Deploy all facets in a single batch transaction
        facetHelper.deployBatch(deployer);

        // Add operators
        address[] memory operators = new address[](1);
        operators[0] = deployer;
        address facet = facetHelper.getDeployedAddress("OperatorRegistry");
        addFacet(
            DeployOperatorRegistry.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployOperatorRegistry.makeInitData(operators)
        );

        // Add config managers
        address[] memory configManagers = new address[](1);
        configManagers[0] = deployer;
        facet = facetHelper.getDeployedAddress("RiverConfig");
        addFacet(
            DeployRiverConfig.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployRiverConfig.makeInitData(configManagers)
        );

        facet = facetHelper.getDeployedAddress("NodeRegistry");
        addCut(DeployNodeRegistry.makeCut(facet, IDiamond.FacetCutAction.Add));

        facet = facetHelper.getDeployedAddress("StreamRegistry");
        addCut(DeployStreamRegistry.makeCut(facet, IDiamond.FacetCutAction.Add));

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

            if (facetName.eq("OperatorRegistry")) {
                address[] memory operators = new address[](1);
                operators[0] = deployer;
                addFacet(
                    DeployOperatorRegistry.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployOperatorRegistry.makeInitData(operators)
                );
            } else if (facetName.eq("RiverConfig")) {
                address[] memory configManagers = new address[](1);
                configManagers[0] = deployer;
                addFacet(
                    DeployRiverConfig.makeCut(facet, IDiamond.FacetCutAction.Add),
                    facet,
                    DeployRiverConfig.makeInitData(configManagers)
                );
            } else if (facetName.eq("NodeRegistry")) {
                addCut(DeployNodeRegistry.makeCut(facet, IDiamond.FacetCutAction.Add));
            } else if (facetName.eq("StreamRegistry")) {
                addCut(DeployStreamRegistry.makeCut(facet, IDiamond.FacetCutAction.Add));
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
