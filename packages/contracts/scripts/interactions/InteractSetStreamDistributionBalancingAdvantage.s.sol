// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces
import {IRiverConfig} from "src/river/registry/facets/config/IRiverConfig.sol";

// libraries
import {RiverConfigValues} from "scripts/interactions/helpers/RiverConfigValues.sol";

// contracts
import {Interaction} from "scripts/common/Interaction.s.sol";

/// @notice Sets the min and max balancing advantage for required operator node selection.
/// @dev Values are in basis points (e.g., 500 = 5%, 750 = 7.5%).
/// These settings control load balancing when selecting among required operator nodes:
/// - MinBalancingAdvantage: Minimum advantage for less-loaded nodes (default: 500 = 5%)
/// - MaxBalancingAdvantage: Maximum advantage for less-loaded nodes (default: 750 = 7.5%)
contract InteractSetStreamDistributionBalancingAdvantage is Interaction {
    function __interact(address deployer) internal override {
        address riverRegistry = getDeployment("riverRegistry");

        // Values in basis points (100 = 1%, 500 = 5%, 750 = 7.5%)
        uint64 minBalancingAdvantage = 500; // 5%
        uint64 maxBalancingAdvantage = 750; // 7.5%

        vm.startBroadcast(deployer);

        IRiverConfig(riverRegistry).setConfiguration(
            RiverConfigValues.STREAM_DISTRIBUTION_MIN_BALANCING_ADVANTAGE,
            0, // blockNumber: 0 means effective immediately
            abi.encode(minBalancingAdvantage)
        );

        IRiverConfig(riverRegistry).setConfiguration(
            RiverConfigValues.STREAM_DISTRIBUTION_MAX_BALANCING_ADVANTAGE,
            0, // blockNumber: 0 means effective immediately
            abi.encode(maxBalancingAdvantage)
        );

        vm.stopBroadcast();
    }
}
