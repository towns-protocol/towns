// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IHookBase, HookConfig, Hook} from "./IHookBase.sol";

// libraries
import {ExecutorStorage} from "../ExecutorStorage.sol";
import {CustomRevert} from "../../../../utils/libraries/CustomRevert.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {LibCall} from "solady/utils/LibCall.sol";
import {HookLib} from "./HookLib.sol";

// contracts

abstract contract HookBase is IHookBase {
    using EnumerableSetLib for EnumerableSetLib.Bytes32Set;
    using CustomRevert for bytes4;
    using HookLib for HookConfig;

    uint256 internal constant MAX_HOOKS = 10;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           HOOKS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function _addHook(
        address module,
        bytes4 selector,
        uint32 entityId,
        bool isPre,
        bool isPost
    ) internal {
        HookConfig storage config = _getConfig(module, selector);
        bytes32 hookId = _entityId(module, entityId);

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

    function _removeHook(address module, bytes4 selector, uint32 entityId) internal {
        HookConfig storage config = _getConfig(module, selector);
        bytes32 hookId = _entityId(module, entityId);

        if (!config.isHookActive(hookId)) HookDoesNotExist.selector.revertWith();

        config.removeHook(hookId, selector);

        emit HookRemoved(module, selector, entityId);
    }

    function _callPreHooks(
        address module,
        bytes4 selector,
        uint256 value,
        bytes calldata data
    ) internal {
        HookConfig storage config = _getConfig(module, selector);

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

    function _callPostHooks(address module, bytes4 selector) internal {
        HookConfig storage config = _getConfig(module, selector);

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

    function _getHooks(
        address module,
        bytes4 selector,
        bool isPre
    ) internal view returns (Hook[] memory hooks) {
        HookConfig storage config = _getConfig(module, selector);
        EnumerableSetLib.Bytes32Set storage hookSet = isPre ? config.preHooks : config.postHooks;

        uint256 length = hookSet.length();
        hooks = new Hook[](length);

        for (uint256 i; i < length; ++i) {
            bytes32 hookId = hookSet.at(i);
            hooks[i] = config.hookData[hookId];
        }
    }

    function _hasHook(
        address module,
        bytes4 selector,
        uint32 entityId,
        bool isPre
    ) internal view returns (bool) {
        HookConfig storage config = _getConfig(module, selector);
        bytes32 hookId = _entityId(module, entityId);

        EnumerableSetLib.Bytes32Set storage hooks = isPre ? config.preHooks : config.postHooks;

        return hooks.contains(hookId);
    }

    function _configId(address target, bytes4 selector) internal pure returns (bytes32) {
        return keccak256(abi.encode(target, selector));
    }

    function _entityId(address module, uint32 entity) internal pure returns (bytes32) {
        return keccak256(abi.encode(module, entity));
    }

    function _getConfig(
        address module,
        bytes4 selector
    ) internal view virtual returns (HookConfig storage config) {
        bytes32 id = _configId(module, selector);
        config = ExecutorStorage.getLayout().hooks[id];
    }
}
