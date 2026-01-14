// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IFeeManager} from "src/factory/facets/fee/IFeeManager.sol";
import {IPlatformRequirements} from "src/factory/facets/platform/requirements/IPlatformRequirements.sol";

// libraries
import {FeeTypesLib} from "src/factory/facets/fee/FeeTypesLib.sol";
import {FeeCalculationMethod} from "src/factory/facets/fee/FeeManagerStorage.sol";
import {console} from "forge-std/console.sol";

// contracts
import {Interaction} from "../common/Interaction.s.sol";

/// @title InteractDomainFee
/// @notice Interaction script to configure domain registration fee and hook
contract InteractDomainFee is Interaction {
    function __interact(address deployer) internal override {
        address spaceFactory = getDeployment("spaceFactory");
        address domainFeeHook = getDeployment("utils/domainFeeHook");

        console.log("SpaceFactory Diamond:", spaceFactory);
        console.log("Domain Fee Hook:", domainFeeHook);

        // Get fee recipient from PlatformRequirementsFacet
        address feeRecipient = IPlatformRequirements(spaceFactory).getFeeRecipient();
        console.log("Fee Recipient:", feeRecipient);

        // Set fee configuration for domain registration
        // The hook will override the fee calculation, so we use FIXED with 0 values
        console.log("\n=== Setting Fee Config for Domain Registration ===");
        vm.broadcast(deployer);
        IFeeManager(spaceFactory).setFeeConfig(
            FeeTypesLib.DOMAIN_REGISTRATION,
            feeRecipient, // recipient from PlatformRequirements
            FeeCalculationMethod.FIXED, // method (hook overrides the calculation)
            0, // bps (not used for FIXED)
            0, // fixedFee (hook overrides)
            true // enabled
        );
        console.log("Fee config set for DOMAIN_REGISTRATION");
        console.log("  Recipient:", feeRecipient);
        console.log("  Method: FIXED (hook overrides)");
        console.log("  Enabled: true");

        // Set the domain fee hook
        console.log("\n=== Setting Domain Fee Hook ===");
        vm.broadcast(deployer);
        IFeeManager(spaceFactory).setFeeHook(FeeTypesLib.DOMAIN_REGISTRATION, domainFeeHook);
        console.log("Fee hook set for DOMAIN_REGISTRATION:", domainFeeHook);

        // Verify configuration
        console.log("\n=== Verifying Configuration ===");
        address configuredHook = IFeeManager(spaceFactory).getFeeHook(
            FeeTypesLib.DOMAIN_REGISTRATION
        );
        console.log("Configured hook:", configuredHook);

        console.log("\n=== Domain Fee Configuration Complete ===");
    }
}
