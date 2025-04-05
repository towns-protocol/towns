// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {
    ExecutionStorage,
    ModuleEntity,
    ValidationStorage
} from "@erc6900/reference-implementation/src/account/AccountStorage.sol";

// contracts

library PluginStorage {
    /// keccak256(abi.encode(uint256(keccak256("spaces.facets.plugin.manager.storage")) - 1)) &
    /// ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x1cd7ad3eb11739ff5d8970337aab51d86a994d878709c16ae6d379645a24c600;

    struct Layout {
        mapping(bytes4 selector => ExecutionStorage) executionStorage;
        mapping(ModuleEntity validationFunction => ValidationStorage) validationStorage;
    }

    function getLayout() internal pure returns (Layout storage s) {
        assembly {
            s.slot := STORAGE_SLOT
        }
    }
}
