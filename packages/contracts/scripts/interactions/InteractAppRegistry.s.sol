// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IAppFactoryBase} from "src/apps/facets/factory/IAppFactory.sol";
import {UpgradeableBeaconFacet} from "src/diamond/facets/beacon/UpgradeableBeaconFacet.sol";

// libraries
import {console} from "forge-std/console.sol";

// contracts
import {Interaction} from "../common/Interaction.s.sol";
import {AlphaHelper} from "./helpers/AlphaHelper.sol";
import {DeployAppRegistry} from "../deployments/diamonds/DeployAppRegistry.s.sol";
import {DeploySimpleAppBeacon} from "../deployments/diamonds/DeploySimpleAppBeacon.s.sol";

// facet deployers
import {MultiInit} from "@towns-protocol/diamond/src/initializers/MultiInit.sol";
import {DeployIdentityRegistry} from "../deployments/facets/DeployIdentityRegistry.s.sol";
import {DeployReputationRegistry} from "../deployments/facets/DeployReputationRegistry.s.sol";
import {DeployFacet} from "../common/DeployFacet.s.sol";

contract InteractAppRegistry is Interaction, AlphaHelper {
    DeployAppRegistry private deployHelper = new DeployAppRegistry();
    DeploySimpleAppBeacon private beaconHelper = new DeploySimpleAppBeacon();
    DeployFacet private facetHelper = new DeployFacet();

    string internal constant FEEDBACK_SCHEMA =
        "uint256 agentId, uint8 score, bytes32 tag1, bytes32 tag2, string feedbackUri, bytes32 feedbackHash";
    string internal constant RESPONSE_SCHEMA =
        "uint256 agentId, address reviewerAddress, uint64 feedbackIndex, string responseUri, bytes32 responseHash";

    function __interact(address deployer) internal override {
        // Get the deployed contract addresses
        address appRegistry = getDeployment("appRegistry");
        address simpleAppBeacon = getDeployment("simpleAppBeacon");

        console.log("AppRegistry Diamond:", appRegistry);
        console.log("Simple App Beacon:", simpleAppBeacon);

        // Deploy new facet implementations
        console.log("\n=== Deploying New Facets ===");
        vm.setEnv("OVERRIDE_DEPLOYMENTS", "1");

        // Deploy Identity Registry Facet
        address identityRegistryFacet = DeployIdentityRegistry.deploy();
        console.log("IdentityRegistryFacet deployed at:", identityRegistryFacet);

        // Deploy Reputation Registry Facet
        address reputationRegistryFacet = DeployReputationRegistry.deploy();
        console.log("ReputationRegistryFacet deployed at:", reputationRegistryFacet);

        // Deploy new version of Simple App Facet
        facetHelper.add("SimpleAppFacet");
        facetHelper.deployBatch(deployer);
        address newSimpleAppFacet = facetHelper.getDeployedAddress("SimpleAppFacet");
        console.log("SimpleAppFacet deployed at:", newSimpleAppFacet);

        // Upgrade Simple App Beacon to use new implementation
        console.log("\n=== Upgrading Simple App Beacon ===");
        vm.broadcast(deployer);
        UpgradeableBeaconFacet(simpleAppBeacon).upgradeTo(newSimpleAppFacet);
        console.log("Simple App Beacon upgraded to:", newSimpleAppFacet);

        // Add the cuts for the new registry facets (Add action)
        addCut(DeployIdentityRegistry.makeCut(identityRegistryFacet, FacetCutAction.Add));
        addCut(DeployReputationRegistry.makeCut(reputationRegistryFacet, FacetCutAction.Add));

        // Prepare initialization data for the new facets
        bytes memory identityInitData = DeployIdentityRegistry.makeInitData();
        bytes memory reputationInitData = DeployReputationRegistry.makeInitData(
            FEEDBACK_SCHEMA,
            RESPONSE_SCHEMA
        );

        // Prepare combined initialization using MultiInit pattern
        address[] memory initAddresses = new address[](2);
        bytes[] memory initDatas = new bytes[](2);

        initAddresses[0] = identityRegistryFacet;
        initDatas[0] = identityInitData;

        initAddresses[1] = reputationRegistryFacet;
        initDatas[1] = reputationInitData;

        // Get MultiInit address from facet helper
        facetHelper.add("MultiInit");
        facetHelper.deployBatch(deployer);
        address multiInit = facetHelper.getDeployedAddress("MultiInit");

        bytes memory combinedInitData = abi.encodeCall(
            MultiInit.multiInit,
            (initAddresses, initDatas)
        );

        // Generate and execute smart cuts with initialization
        console.log("\n=== Executing Diamond Cut with Initialization ===");
        executeDiamondCutsWithLogging(
            deployer,
            appRegistry,
            "AppRegistry",
            deployHelper,
            multiInit,
            combinedInitData
        );

        console.log("\n=== Diamond Cut Complete ===");
    }
}
