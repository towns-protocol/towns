// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IFeeManager} from "src/factory/facets/fee/IFeeManager.sol";
import {IPlatformRequirements} from "src/factory/facets/platform/requirements/IPlatformRequirements.sol";
import {IDiamondCut} from "@towns-protocol/diamond/src/facets/cut/IDiamondCut.sol";

// libraries
import {FeeTypesLib} from "src/factory/facets/fee/FeeTypesLib.sol";
import {FeeCalculationMethod} from "src/factory/facets/fee/FeeManagerStorage.sol";
import {console} from "forge-std/console.sol";
import {DeployFeeManager} from "../deployments/facets/DeployFeeManager.s.sol";

// contracts
import {Interaction} from "../common/Interaction.s.sol";
import {AlphaHelper} from "./helpers/AlphaHelper.sol";

contract InteractSpaceFactory is Interaction, AlphaHelper {
    function __interact(address deployer) internal override {
        // Get the deployed SpaceFactory diamond address
        address spaceFactory = getDeployment("spaceFactory");

        console.log("SpaceFactory Diamond:", spaceFactory);

        // Set fee recipient in PlatformRequirementsFacet
        console.log("\n=== Setting Fee Recipient in PlatformRequirementsFacet ===");
        vm.broadcast(deployer);
        IPlatformRequirements(spaceFactory).setFeeRecipient(deployer);
        console.log("Fee recipient set to:", deployer);

        // Get fee recipient from PlatformRequirementsFacet
        address protocolFeeRecipient = IPlatformRequirements(spaceFactory).getFeeRecipient();
        console.log("Protocol Fee Recipient:", protocolFeeRecipient);

        // Deploy new FeeManagerFacet implementation
        console.log("\n=== Deploying FeeManagerFacet ===");
        vm.setEnv("OVERRIDE_DEPLOYMENTS", "1");

        address feeManagerFacet = DeployFeeManager.deploy();
        console.log("FeeManagerFacet deployed at:", feeManagerFacet);

        // Add the cut for the new facet implementation
        addCut(DeployFeeManager.makeCut(feeManagerFacet, FacetCutAction.Add));

        // Prepare initialization data with the fee recipient from PlatformRequirementsFacet
        bytes memory initData = DeployFeeManager.makeInitData(protocolFeeRecipient);

        // Execute the diamond cut with initialization
        console.log("\n=== Executing Diamond Cut with Initialization ===");
        vm.broadcast(deployer);
        IDiamondCut(spaceFactory).diamondCut(baseFacets(), feeManagerFacet, initData);

        console.log("\n=== Diamond Cut Complete ===");

        // Set fee config for tipping
        console.log("\n=== Setting Fee Config for Tipping ===");
        vm.broadcast(deployer);
        IFeeManager(spaceFactory).setFeeConfig(
            FeeTypesLib.TIP_MEMBER,
            address(0),
            FeeCalculationMethod.PERCENT,
            50, // 0.5% (50 basis points)
            0,
            true
        );

        console.log("Fee config set for TIP_MEMBER: 0.5% (50 bps)");
        console.log("\n=== Interaction Complete ===");
    }
}
