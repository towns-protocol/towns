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
import {DeployMetadata} from "../facets/DeployMetadata.s.sol";
import {DeployAppRegistryFacet} from "../facets/DeployAppRegistryFacet.s.sol";
import {DeployUpgradeableBeacon} from "../facets/DeployUpgradeableBeacon.s.sol";
import {DeployAppInstallerFacet} from "../facets/DeployAppInstallerFacet.s.sol";
import {DeployAppFactoryFacet} from "../facets/DeployAppFactoryFacet.s.sol";
import {DeploySpaceFactory} from "../diamonds/DeploySpaceFactory.s.sol";

// contracts
import {Diamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {MultiInit} from "@towns-protocol/diamond/src/initializers/MultiInit.sol";
import {DiamondHelper} from "@towns-protocol/diamond/scripts/common/helpers/DiamondHelper.s.sol";

// deployers
import {DeployFacet} from "../../common/DeployFacet.s.sol";
import {Deployer} from "../../common/Deployer.s.sol";

contract DeployAppRegistry is IDiamondInitHelper, DiamondHelper, Deployer {
    using LibString for string;

    DeployFacet private facetHelper = new DeployFacet();
    DeploySpaceFactory private deploySpaceFactory = new DeploySpaceFactory();

    string internal constant APP_REGISTRY_SCHEMA = "address app, address client";
    address internal spaceFactory;

    function versionName() public pure override returns (string memory) {
        return "appRegistry";
    }

    function addImmutableCuts(address deployer) internal {
        spaceFactory = deploySpaceFactory.deploy(deployer);

        // Queue up all core facets for batch deployment
        facetHelper.add("DiamondCutFacet");
        facetHelper.add("DiamondLoupeFacet");
        facetHelper.add("IntrospectionFacet");
        facetHelper.add("OwnableFacet");
        facetHelper.add("MetadataFacet");

        // Deploy the first batch of facets
        facetHelper.deployBatch(deployer);

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

        facet = facetHelper.getDeployedAddress("MetadataFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployMetadata.selectors()),
            facet,
            DeployMetadata.makeInitData(bytes32("AppRegistry"), "")
        );
    }

    function diamondInitParams(address deployer) public returns (Diamond.InitParams memory) {
        // Queue up feature facets for batch deployment
        facetHelper.add("MultiInit");
        facetHelper.add("UpgradeableBeaconFacet");
        facetHelper.add("AppRegistryFacet");
        facetHelper.add("AppInstallerFacet");
        facetHelper.add("AppFactoryFacet");
        facetHelper.add("SimpleApp");

        facetHelper.deployBatch(deployer);

        address simpleApp = facetHelper.getDeployedAddress("SimpleApp");
        address facet = facetHelper.getDeployedAddress("UpgradeableBeaconFacet");

        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployUpgradeableBeacon.selectors()),
            facet,
            DeployUpgradeableBeacon.makeInitData(simpleApp)
        );

        facet = facetHelper.getDeployedAddress("AppRegistryFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployAppRegistryFacet.selectors()),
            facet,
            DeployAppRegistryFacet.makeInitData(spaceFactory, APP_REGISTRY_SCHEMA, address(0))
        );

        facet = facetHelper.getDeployedAddress("AppInstallerFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployAppInstallerFacet.selectors()),
            facet,
            DeployAppInstallerFacet.makeInitData()
        );

        facet = facetHelper.getDeployedAddress("AppFactoryFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployAppFactoryFacet.selectors()),
            facet,
            DeployAppFactoryFacet.makeInitData()
        );

        address multiInit = facetHelper.getDeployedAddress("MultiInit");

        return
            Diamond.InitParams({
                baseFacets: baseFacets(),
                init: multiInit,
                initData: abi.encodeCall(MultiInit.multiInit, (_initAddresses, _initDatas))
            });
    }

    function diamondInitHelper(
        address deployer,
        string[] memory facetNames
    ) external override returns (FacetCut[] memory) {
        // Queue up all requested facets for batch deployment
        for (uint256 i; i < facetNames.length; ++i) {
            facetHelper.add(facetNames[i]);
        }

        // Deploy all requested facets in a single batch transaction
        facetHelper.deployBatch(deployer);

        for (uint256 i; i < facetNames.length; ++i) {
            string memory facetName = facetNames[i];
            address facet = facetHelper.getDeployedAddress(facetName);

            if (facetName.eq("AppRegistryFacet")) {
                addCut(makeCut(facet, FacetCutAction.Add, DeployAppRegistryFacet.selectors()));
            }
            if (facetName.eq("AppInstallerFacet")) {
                addCut(makeCut(facet, FacetCutAction.Add, DeployAppInstallerFacet.selectors()));
            }
            if (facetName.eq("AppFactoryFacet")) {
                addCut(makeCut(facet, FacetCutAction.Add, DeployAppFactoryFacet.selectors()));
            }
        }

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
