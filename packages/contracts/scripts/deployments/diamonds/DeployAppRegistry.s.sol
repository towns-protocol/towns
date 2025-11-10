// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamondInitHelper} from "./IDiamondInitHelper.sol";
import {IAppFactoryBase} from "src/apps/facets/factory/IAppFactory.sol";

// libraries
import {DeployDiamondCut} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondCut.sol";
import {DeployDiamondLoupe} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondLoupe.sol";
import {DeployIntrospection} from "@towns-protocol/diamond/scripts/deployments/facets/DeployIntrospection.sol";
import {DeployOwnable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployOwnable.sol";
import {LibString} from "solady/utils/LibString.sol";
import {DeployMetadata} from "../facets/DeployMetadata.s.sol";
import {DeployAppRegistryFacet} from "../facets/DeployAppRegistryFacet.s.sol";
import {DeployAppInstallerFacet} from "../facets/DeployAppInstallerFacet.s.sol";
import {DeployAppFactoryFacet} from "../facets/DeployAppFactoryFacet.s.sol";
import {DeploySpaceFactory} from "../diamonds/DeploySpaceFactory.s.sol";
import {DeploySimpleAppBeacon} from "../diamonds/DeploySimpleAppBeacon.s.sol";
import {DeployIdentityRegistry} from "../facets/DeployIdentityRegistry.s.sol";

// contracts
import {Diamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {MultiInit} from "@towns-protocol/diamond/src/initializers/MultiInit.sol";
import {DiamondHelper} from "@towns-protocol/diamond/scripts/common/helpers/DiamondHelper.s.sol";
import {EntryPoint} from "@eth-infinitism/account-abstraction/core/EntryPoint.sol";

// deployers
import {DeployFacet} from "../../common/DeployFacet.s.sol";
import {Deployer} from "../../common/Deployer.s.sol";

contract DeployAppRegistry is IDiamondInitHelper, DiamondHelper, Deployer {
    using LibString for string;

    DeployFacet private facetHelper = new DeployFacet();
    DeploySpaceFactory private deploySpaceFactory = new DeploySpaceFactory();
    DeploySimpleAppBeacon private deploySimpleAppBeacon = new DeploySimpleAppBeacon();

    string internal constant APP_REGISTRY_SCHEMA = "address app, address client";
    address internal spaceFactory;
    address internal simpleAppBeacon;

    function versionName() public pure override returns (string memory) {
        return "appRegistry";
    }

    function addImmutableCuts(address deployer) internal {
        spaceFactory = deploySpaceFactory.deploy(deployer);
        simpleAppBeacon = deploySimpleAppBeacon.deploy(deployer);

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

        facet = facetHelper.predictAddress("MetadataFacet");
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
        facetHelper.add("IdentityRegistryFacet");

        facetHelper.deployBatch(deployer);

        address facet = facetHelper.getDeployedAddress("AppRegistryFacet");
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

        IAppFactoryBase.Beacon[] memory beacons = new IAppFactoryBase.Beacon[](1);
        beacons[0] = IAppFactoryBase.Beacon({
            beaconId: deploySimpleAppBeacon.SIMPLE_APP_BEACON_ID(),
            beacon: simpleAppBeacon
        });

        facet = facetHelper.getDeployedAddress("AppFactoryFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployAppFactoryFacet.selectors()),
            facet,
            DeployAppFactoryFacet.makeInitData(beacons, _getEntryPoint())
        );

        facet = facetHelper.getDeployedAddress("IdentityRegistryFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployIdentityRegistry.selectors()),
            facet,
            DeployIdentityRegistry.makeInitData()
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
            if (facetName.eq("IdentityRegistryFacet")) {
                addCut(makeCut(facet, FacetCutAction.Add, DeployIdentityRegistry.selectors()));
            }
        }

        return baseFacets();
    }

    function __deploy(address deployer) internal override returns (address) {
        addImmutableCuts(deployer);

        Diamond.InitParams memory initDiamondCut = diamondInitParams(deployer);

        vm.startBroadcast(deployer);
        Diamond diamond = new Diamond(initDiamondCut);
        vm.stopBroadcast();

        return address(diamond);
    }

    function _getEntryPoint() internal returns (address) {
        if (isTesting()) return address(new EntryPoint());
        return 0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108;
    }
}
