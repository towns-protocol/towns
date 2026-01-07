// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces
import {IRiverConfig} from "src/river/registry/facets/config/IRiverConfig.sol";

// libraries
import {RiverConfigValues} from "scripts/interactions/helpers/RiverConfigValues.sol";

// contracts
import {Interaction} from "scripts/common/Interaction.s.sol";

/// @notice Per-stream trim target configuration.
/// @dev This struct must match the ABI encoding in core/node/crypto/config.go (streamIdMiniblockArrayType).
struct StreamIdMiniblock {
    bytes32 streamId;
    uint64 miniblockNum;
}

contract InteractRiverRegistrySetTrimByStreamId is Interaction {
    function __interact(address deployer) internal override {
        address riverRegistry = getDeployment("riverRegistry");

        // NOTE: Set block to something recent, otherwise older records will supersede the new one
        // For get recent block from command line for env:
        //     ./core/env/<ENV_NAME>/run.sh registry blocknumber
        uint64 blockNumber = 13824246;

        // Configure stream IDs and their corresponding miniblock trim targets
        StreamIdMiniblock[] memory targets = new StreamIdMiniblock[](2);

        // Example entries - modify as needed
        targets[0] = StreamIdMiniblock({streamId: bytes32(0), miniblockNum: 100});
        targets[1] = StreamIdMiniblock({streamId: bytes32(0), miniblockNum: 200});

        vm.startBroadcast(deployer);
        IRiverConfig(riverRegistry).setConfiguration(
            RiverConfigValues.STREAM_TRIM_BY_STREAM_ID,
            blockNumber,
            abi.encode(targets)
        );
        vm.stopBroadcast();
    }
}
