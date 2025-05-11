// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {CustomRevert} from "../../../../utils/libraries/CustomRevert.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {LibCall} from "solady/utils/LibCall.sol";

// contracts

library HookLib {
    using EnumerableSetLib for EnumerableSetLib.Bytes32Set;
    using CustomRevert for bytes4;
    using HookLib for HookConfig;

    uint256 internal constant MAX_HOOKS = 10;

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

    function getLayout() internal pure returns (Layout storage db) {
        assembly {
            db.slot := STORAGE_SLOT
        }
    }

    function createHookId(address module, uint32 entityId) internal pure returns (bytes32) {
        return keccak256(abi.encode(module, entityId));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    error HookAlreadyExists();
    error HookDoesNotExist();
    error TooManyHooks();
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
        bool isPost
    ) internal {
        Layout storage db = getLayout();
        HookConfig storage config = db.hooks[module][selector];

        bytes32 hookId = createHookId(module, entityId);

        if (config.isHookActive(hookId)) HookAlreadyExists.selector.revertWith();

        config.createHook(hookId, module, entityId);

        if (isPre) {
            if (config.preHooks.length() >= MAX_HOOKS) TooManyHooks.selector.revertWith();
            config.preHooks.add(hookId);
        }

        if (isPost) {
            if (config.postHooks.length() >= MAX_HOOKS) TooManyHooks.selector.revertWith();
            config.postHooks.add(hookId);
        }

        emit HookAdded(module, selector, entityId, isPre, isPost);
    }

    function removeHook(address module, bytes4 selector, uint32 entityId) internal {
        Layout storage db = getLayout();
        bytes32 hookId = createHookId(module, entityId);

        HookConfig storage config = db.hooks[module][selector];
        if (!config.isHookActive(hookId)) HookDoesNotExist.selector.revertWith();

        config.removeHook(hookId, selector);

        emit HookRemoved(module, selector, entityId);
    }

    function executePreHooks(
        address module,
        bytes4 selector,
        uint256 value,
        bytes calldata data
    ) internal {
        Layout storage db = getLayout();
        HookConfig storage config = db.hooks[module][selector];

        uint256 preHookCount = config.preHooks.length();
        for (uint256 i; i < preHookCount; ++i) {
            bytes32 hookId = config.preHooks.at(i);
            Hook storage hook = config.hookData[hookId];

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

            // Store with selector context
            if (preHookData.length > 0) {
                config.preHookData[selector][hookId] = preHookData;
            }
        }
    }

    function executePostHooks(address module, bytes4 selector) internal {
        Layout storage db = getLayout();
        HookConfig storage config = db.hooks[module][selector];

        uint256 postHookCount = config.postHooks.length();

        for (uint256 i; i < postHookCount; ++i) {
            bytes32 hookId = config.postHooks.at(i);
            Hook storage hook = config.hookData[hookId];

            if (!hook.isActive) continue;

            // Get stored pre-hook data with selector context
            bytes memory preHookData = config.preHookData[selector][hookId];

            LibCall.callContract(
                hook.module,
                abi.encodeWithSignature(
                    "postExecutionHook(uint32,bytes)",
                    hook.entityId,
                    preHookData
                )
            );

            // Clean up storage with selector context
            delete config.preHookData[selector][hookId];
        }
    }

    function getHooks(
        address module,
        bytes4 selector,
        bool isPre
    ) internal view returns (Hook[] memory hooks) {
        Layout storage l = getLayout();
        EnumerableSetLib.Bytes32Set storage hookSet = isPre
            ? l.hooks[module][selector].preHooks
            : l.hooks[module][selector].postHooks;

        uint256 length = hookSet.length();
        hooks = new Hook[](length);

        for (uint256 i; i < length; ++i) {
            bytes32 hookId = hookSet.at(i);
            hooks[i] = l.hooks[module][selector].hookData[hookId];
        }
    }

    function hasHook(
        address module,
        bytes4 selector,
        uint32 entityId,
        bool isPre
    ) internal view returns (bool) {
        Layout storage l = getLayout();
        bytes32 hookId = createHookId(module, entityId);

        EnumerableSetLib.Bytes32Set storage hooks = isPre
            ? l.hooks[module][selector].preHooks
            : l.hooks[module][selector].postHooks;

        return hooks.contains(hookId);
    }

    function isHookActive(HookConfig storage self, bytes32 hookId) internal view returns (bool) {
        return self.hookData[hookId].isActive;
    }

    function createHook(
        HookConfig storage self,
        bytes32 hookId,
        address module,
        uint32 entityId
    ) internal {
        self.hookData[hookId] = Hook({module: module, entityId: entityId, isActive: true});
    }

    function removeHook(HookConfig storage self, bytes32 hookId, bytes4 selector) internal {
        delete self.hookData[hookId];
        delete self.preHookData[selector][hookId];
        self.preHooks.remove(hookId);
        self.postHooks.remove(hookId);
    }
}
