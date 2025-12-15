// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces
import {IRiverConfig} from "src/river/registry/facets/config/IRiverConfig.sol";

// libraries
import {RiverConfigValues} from "scripts/interactions/helpers/RiverConfigValues.sol";

// contracts
import {Interaction} from "scripts/common/Interaction.s.sol";

contract InteractSetGetMiniblocksMaxPageSize is Interaction {
    function __interact(address deployer) internal override {
        address riverRegistry = getDeployment("riverRegistry");

        uint64 value = 200;

        vm.startBroadcast(deployer);
        IRiverConfig(riverRegistry).setConfiguration(
            RiverConfigValues.STREAM_GET_MINIBLOCKS_MAX_PAGE_SIZE,
            0,
            abi.encode(value)
        );
        vm.stopBroadcast();
    }
}
