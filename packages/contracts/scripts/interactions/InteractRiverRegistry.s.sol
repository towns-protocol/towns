// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces
import {IRiverConfig} from "src/river/registry/facets/config/IRiverConfig.sol";

// libraries
import {RiverConfigValues} from "scripts/interactions/helpers/RiverConfigValues.sol";

// contracts
import {Interaction} from "scripts/common/Interaction.s.sol";

contract InteractRiverRegistry is Interaction {
    function __interact(address deployer) internal override {
        address riverRegistry = getDeployment("riverRegistry");

        uint64[] memory chains = new uint64[](9);
        chains[0] = 1; // mainnet
        chains[1] = 11_155_111; // sepolia
        chains[2] = 8453; // base
        chains[3] = 84_532; // base sepolia
        chains[4] = 137; // polygon
        chains[5] = 42_161; // arbitrum
        chains[6] = 10; // optimism
        chains[7] = 100; // gnosis
        chains[8] = 10_200; // gnosis chiado

        vm.startBroadcast(deployer);
        IRiverConfig(riverRegistry).setConfiguration(
            RiverConfigValues.XCHAIN_BLOCKCHAINS,
            0,
            abi.encode(chains)
        );
        vm.stopBroadcast();
    }
}
