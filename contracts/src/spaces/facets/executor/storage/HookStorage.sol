// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";

// contracts

library HookStorage {
    // keccak256(abi.encode(uint256(keccak256("spaces.facets.executor.hook.storage")) - 1)) &
    // ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x6de21252b699dbf6a7f1195b099c65cf8b84fe6c75c379b02ee173319a840200;

    struct Hook {
        address module;
        uint32 entityId;
        bool isActive;
    }

    struct HookConfig {
        EnumerableSetLib.Bytes32Set preHooks;
        EnumerableSetLib.Bytes32Set postHooks;
        mapping(bytes32 hookId => bytes) preHookData;
    }

    struct Layout {
        // Selector => Hook Configuration
        mapping(bytes4 => HookConfig) hooks;
        // Hook ID => Hook Data
        mapping(bytes32 => Hook) hookData;
    }

    function getLayout() internal pure returns (Layout storage db) {
        assembly {
            db.slot := STORAGE_SLOT
        }
    }

    function createHookId(address module, uint32 entityId) internal pure returns (bytes32) {
        return keccak256(abi.encode(module, entityId));
    }
}
