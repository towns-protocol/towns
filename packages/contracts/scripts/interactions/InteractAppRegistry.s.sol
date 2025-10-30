// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IAppFactoryBase} from "src/apps/facets/factory/IAppFactory.sol";

// libraries
import {console} from "forge-std/console.sol";

// contracts
import {Interaction} from "../common/Interaction.s.sol";
import {AlphaHelper} from "./helpers/AlphaHelper.sol";
import {DeployAppRegistry} from "../deployments/diamonds/DeployAppRegistry.s.sol";
import {DeploySimpleAppBeacon} from "../deployments/diamonds/DeploySimpleAppBeacon.s.sol";

// facet deployers
import {DeployAppRegistryFacet} from "../deployments/facets/DeployAppRegistryFacet.s.sol";
import {DeployAppInstallerFacet} from "../deployments/facets/DeployAppInstallerFacet.s.sol";
import {DeployAppFactoryFacet} from "../deployments/facets/DeployAppFactoryFacet.s.sol";

contract InteractAppRegistry is Interaction, AlphaHelper {
    DeployAppRegistry private deployHelper = new DeployAppRegistry();
    DeploySimpleAppBeacon private beaconHelper = new DeploySimpleAppBeacon();

    function __interact(address deployer) internal override {
        // Get the deployed AppRegistry diamond address
        address appRegistry = getDeployment("appRegistry");
        address spaceFactory = getDeployment("spaceFactory");
        address simpleAppBeacon = getDeployment("simpleAppBeacon");
        address entryPoint = getDeployment("entryPoint");

        console.log("AppRegistry Diamond:", appRegistry);
        console.log("Space Factory:", spaceFactory);
        console.log("Simple App Beacon:", simpleAppBeacon);

        // Deploy new facet implementations
        console.log("\n=== Deploying New Facets ===");
        vm.setEnv("OVERRIDE_DEPLOYMENTS", "1");

        address appRegistryFacet = DeployAppRegistryFacet.deploy();
        console.log("AppRegistryFacet deployed at:", appRegistryFacet);

        address appInstallerFacet = DeployAppInstallerFacet.deploy();
        console.log("AppInstallerFacet deployed at:", appInstallerFacet);

        address appFactoryFacet = DeployAppFactoryFacet.deploy();
        console.log("AppFactoryFacet deployed at:", appFactoryFacet);

        // Add the cuts for the new facet implementations
        addCut(DeployAppRegistryFacet.makeCut(appRegistryFacet, FacetCutAction.Replace));
        addCut(DeployAppInstallerFacet.makeCut(appInstallerFacet, FacetCutAction.Replace));
        addCut(DeployAppFactoryFacet.makeCut(appFactoryFacet, FacetCutAction.Replace));

        // Prepare initialization data for AppFactoryFacet with the beacon configuration
        IAppFactoryBase.Beacon[] memory beacons = new IAppFactoryBase.Beacon[](1);
        beacons[0] = IAppFactoryBase.Beacon({
            beaconId: beaconHelper.SIMPLE_APP_BEACON_ID(),
            beacon: simpleAppBeacon
        });
        bytes memory initData = DeployAppFactoryFacet.makeInitData(beacons, entryPoint);

        // Generate and execute smart cuts with initialization
        console.log("\n=== Executing Diamond Cut with Initialization ===");
        executeDiamondCutsWithLogging(
            deployer,
            appRegistry,
            "AppRegistry",
            deployHelper,
            appFactoryFacet,
            initData
        );

        console.log("\n=== Diamond Cut Complete ===");
    }
}
