// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces
import {IRiverConfig} from "src/river/registry/facets/config/IRiverConfig.sol";

// libraries
import {RiverConfigValues} from "scripts/interactions/helpers/RiverConfigValues.sol";

// contracts
import {Interaction} from "scripts/common/Interaction.s.sol";

contract InteractSetStreamHistoryMiniblocks is Interaction {
    function __interact(address deployer) internal override {
        address riverRegistry = getDeployment("riverRegistry");

        uint64 userInboxMiniblocks = 5000;
        uint64 userSettingsMiniblocks = 40;
        uint64 spaceMiniblocks = 400;

        vm.startBroadcast(deployer);
        IRiverConfig(riverRegistry).setConfiguration(
            RiverConfigValues.STREAM_HISTORY_MINIBLOCKS_USER_INBOX,
            0,
            abi.encode(userInboxMiniblocks)
        );
        IRiverConfig(riverRegistry).setConfiguration(
            RiverConfigValues.STREAM_HISTORY_MINIBLOCKS_USER_SETTINGS,
            0,
            abi.encode(userSettingsMiniblocks)
        );
        IRiverConfig(riverRegistry).setConfiguration(
            RiverConfigValues.STREAM_HISTORY_MINIBLOCKS_SPACE,
            0,
            abi.encode(spaceMiniblocks)
        );
        vm.stopBroadcast();
    }
}
