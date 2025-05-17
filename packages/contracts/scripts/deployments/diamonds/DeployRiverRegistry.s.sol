// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
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

    function versionName() public pure override returns (string memory) {
        return "riverRegistry";
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
            makeCut(facet, FacetCutAction.Add, DeployOperatorRegistry.selectors()),
            facet,
            DeployOperatorRegistry.makeInitData(operators)
        );

        // Add config managers
        address[] memory configManagers = new address[](1);
        configManagers[0] = deployer;
        facet = facetHelper.getDeployedAddress("RiverConfig");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployRiverConfig.selectors()),
            facet,
            DeployRiverConfig.makeInitData(configManagers)
        );

        facet = facetHelper.getDeployedAddress("NodeRegistry");
        addCut(makeCut(facet, FacetCutAction.Add, DeployNodeRegistry.selectors()));

        facet = facetHelper.getDeployedAddress("StreamRegistry");
        addCut(makeCut(facet, FacetCutAction.Add, DeployStreamRegistry.selectors()));

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

        // Add the requested facets
        for (uint256 i; i < facets.length; ++i) {
            string memory facetName = facets[i];
            address facet = facetHelper.getDeployedAddress(facetName);

            if (facetName.eq("OperatorRegistry")) {
                address[] memory operators = new address[](1);
                operators[0] = deployer;
                addFacet(
                    makeCut(facet, FacetCutAction.Add, DeployOperatorRegistry.selectors()),
                    facet,
                    DeployOperatorRegistry.makeInitData(operators)
                );
            } else if (facetName.eq("RiverConfig")) {
                address[] memory configManagers = new address[](1);
                configManagers[0] = deployer;
                addFacet(
                    makeCut(facet, FacetCutAction.Add, DeployRiverConfig.selectors()),
                    facet,
                    DeployRiverConfig.makeInitData(configManagers)
                );
            } else if (facetName.eq("NodeRegistry")) {
                addCut(makeCut(facet, FacetCutAction.Add, DeployNodeRegistry.selectors()));
            } else if (facetName.eq("StreamRegistry")) {
                addCut(makeCut(facet, FacetCutAction.Add, DeployStreamRegistry.selectors()));
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
