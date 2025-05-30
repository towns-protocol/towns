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

        address[] memory value = new address[](3);
        value[0] = 0xa7f7D83843aB78706344D3Ae882b1d4f9404F254;
        value[1] = 0x01A7dCd51409758f220c171c209eF3E1C8b10F1E;
        value[2] = 0xC6CF68A1BCD3B9285fe1d13c128953a14Dd1Bb60;

        vm.startBroadcast(deployer);
        IRiverConfig(riverRegistry).setConfiguration(
            RiverConfigValues.NODE_BLOCKLIST,
            13_396_808,
            abi.encode(value)
        );
        vm.stopBroadcast();
    }
}
