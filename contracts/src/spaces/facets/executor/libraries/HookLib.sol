// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {HookStorage} from "../storage/HookStorage.sol";

import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {LibCall} from "solady/utils/LibCall.sol";

// contracts

library HookLib {
    using EnumerableSetLib for EnumerableSetLib.Bytes32Set;
    using CustomRevert for bytes4;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    error HookAlreadyExists();
    error HookDoesNotExist();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    event HookAdded(
        address indexed module,
        bytes4 indexed selector,
        uint32 indexed entityId,
        bool isPre,
        bool isPostHook
    );
    event HookRemoved(address indexed module, bytes4 indexed selector, uint32 indexed entityId);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           HOOKS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function addHook(
        address module,
        bytes4 selector,
        uint32 entityId,
        bool isPre,
        bool isPostHook
    )
        internal
    {
        HookStorage.Layout storage db = HookStorage.getLayout();
        bytes32 hookId = HookStorage.createHookId(module, entityId);

        if (db.hookData[hookId].isActive) HookAlreadyExists.selector.revertWith();

        db.hookData[hookId] = HookStorage.Hook({module: module, entityId: entityId, isActive: true});

        HookStorage.HookConfig storage config = db.hooks[selector];

        if (isPre) {
            config.preHooks.add(hookId);
        } else {
            config.postHooks.add(hookId);
        }

        emit HookAdded(module, selector, entityId, isPre, isPostHook);
    }

    function removeHook(address module, bytes4 selector, uint32 entityId) internal {
        HookStorage.Layout storage db = HookStorage.getLayout();
        bytes32 hookId = HookStorage.createHookId(module, entityId);

        if (!db.hookData[hookId].isActive) HookDoesNotExist.selector.revertWith();

        HookStorage.HookConfig storage config = db.hooks[selector];
        config.preHooks.remove(hookId);
        config.postHooks.remove(hookId);
        delete config.preHookData[hookId];

        db.hookData[hookId].isActive = false;

        emit HookRemoved(module, selector, entityId);
    }

    function executePreHooks(bytes4 selector, uint256 value, bytes calldata data) internal {
        HookStorage.Layout storage db = HookStorage.getLayout();
        HookStorage.HookConfig storage config = db.hooks[selector];

        uint256 preHookCount = config.preHooks.length();
        for (uint256 i; i < preHookCount; ++i) {
            bytes32 hookId = config.preHooks.at(i);
            HookStorage.Hook storage hook = db.hookData[hookId];

            if (!hook.isActive) continue;

            // Execute pre-hook and capture its return data
            bytes memory preHookData = LibCall.callContract(
                hook.module,
                abi.encodeWithSignature(
                    "preExecutionHook(uint32,address,uint256,bytes)",
                    hook.entityId,
                    msg.sender,
                    value,
                    data
                )
            );

            config.preHookData[hookId] = preHookData;
        }
    }

    function executePostHooks(bytes4 selector) internal {
        HookStorage.Layout storage db = HookStorage.getLayout();
        HookStorage.HookConfig storage config = db.hooks[selector];

        uint256 postHookCount = config.postHooks.length();

        for (uint256 i; i < postHookCount; ++i) {
            bytes32 hookId = config.postHooks.at(i);
            HookStorage.Hook storage hook = db.hookData[hookId];

            if (!hook.isActive) continue;

            // Get stored pre-hook data
            bytes memory preHookData = config.preHookData[hookId];

            LibCall.callContract(
                hook.module,
                abi.encodeWithSignature(
                    "postExecutionHook(uint32,bytes)", hook.entityId, preHookData
                )
            );

            delete config.preHookData[hookId];
        }
    }

    function getHooks(
        bytes4 selector,
        bool isPre
    )
        internal
        view
        returns (HookStorage.Hook[] memory hooks)
    {
        HookStorage.Layout storage l = HookStorage.getLayout();
        EnumerableSetLib.Bytes32Set storage hookSet =
            isPre ? l.hooks[selector].preHooks : l.hooks[selector].postHooks;

        uint256 length = hookSet.length();
        hooks = new HookStorage.Hook[](length);

        for (uint256 i; i < length; ++i) {
            bytes32 hookId = hookSet.at(i);
            hooks[i] = l.hookData[hookId];
        }
    }

    function hasHook(
        bytes4 selector,
        address module,
        uint32 entityId,
        bool isPre
    )
        internal
        view
        returns (bool)
    {
        HookStorage.Layout storage l = HookStorage.getLayout();
        bytes32 hookId = HookStorage.createHookId(module, entityId);

        EnumerableSetLib.Bytes32Set storage hooks =
            isPre ? l.hooks[selector].preHooks : l.hooks[selector].postHooks;

        return hooks.contains(hookId);
    }
}
