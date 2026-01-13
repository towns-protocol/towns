// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces
import {IRiverConfig} from "src/river/registry/facets/config/IRiverConfig.sol";

// libraries
import {RiverConfigValues} from "scripts/interactions/helpers/RiverConfigValues.sol";

// contracts
import {Interaction} from "scripts/common/Interaction.s.sol";

/// @notice Sets the required operators for stream placement.
/// @dev When placing a stream, at least one node from a required operator must be selected
/// if any required operator has operational nodes available.
contract InteractSetStreamDistributionRequiredOperators is Interaction {
    function __interact(address deployer) internal override {
        address riverRegistry = getDeployment("riverRegistry");

        // Configure the required operator addresses here
        address[] memory requiredOperators = new address[](1);
        requiredOperators[0] = address(0); // Replace with actual operator address

        vm.startBroadcast(deployer);
        IRiverConfig(riverRegistry).setConfiguration(
            RiverConfigValues.STREAM_DISTRIBUTION_REQUIRED_OPERATORS,
            0, // blockNumber: 0 means effective immediately
            abi.encode(requiredOperators)
        );
        vm.stopBroadcast();
    }
}
