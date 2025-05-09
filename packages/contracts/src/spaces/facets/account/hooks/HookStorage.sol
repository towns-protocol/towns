// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library HookStorage {
    struct Hook {
        address module;
        uint32 entityId;
        bool isActive;
    }

    struct HookConfig {
        EnumerableSetLib.Bytes32Set preHooks;
        EnumerableSetLib.Bytes32Set postHooks;
        mapping(bytes4 selector => mapping(bytes32 hookId => bytes)) preHookData;
        mapping(bytes32 hookId => Hook) hookData;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           STORAGE                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    // keccak256(abi.encode(uint256(keccak256("spaces.facets.executor.hook.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x6de21252b699dbf6a7f1195b099c65cf8b84fe6c75c379b02ee173319a840200;

    struct Layout {
        // Target => Selector => Hook Configuration
        mapping(address target => mapping(bytes4 selector => HookConfig config)) hooks;
    }
}
