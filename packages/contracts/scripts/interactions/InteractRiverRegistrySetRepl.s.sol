// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces
import {IRiverConfig} from "src/river/registry/facets/config/IRiverConfig.sol";

// libraries
import {RiverConfigValues} from "scripts/interactions/helpers/RiverConfigValues.sol";

// contracts
import {Interaction} from "scripts/common/Interaction.s.sol";

contract InteractRiverRegistrySetFreq is Interaction {
    function __interact(address deployer) internal override {
        address riverRegistry = getDeployment("riverRegistry");

        uint64 value = 3;

        // NOTE: Set block to something recent, otherwise older records will supersede the new one
        // For get recent block from command line for env:
        //     ./core/env/<ENV_NAME>/run.sh registry blocknumber
        vm.startBroadcast(deployer);
        IRiverConfig(riverRegistry).setConfiguration(
            RiverConfigValues.STREAM_REPLICATION_FACTOR,
            13824246, // Block number
            abi.encode(value)
        );
        vm.stopBroadcast();
    }
}
