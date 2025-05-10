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

/**
 * @title HookBase
 * @author Towns Protocol Team
 * @notice Base contract for implementing hook functionality in the executor system
 * @dev This abstract contract provides the core implementation for managing pre and post execution hooks
 *      Hooks allow modules to execute custom logic before and after function calls
 */
abstract contract HookBase is IHookBase {
    using EnumerableSetLib for EnumerableSetLib.Bytes32Set;
    using CustomRevert for bytes4;
    using HookLib for HookConfig;

    /// @notice Maximum number of hooks that can be added to prevent DoS attacks
    uint256 internal constant MAX_HOOK_COUNT = 5;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           HOOKS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /**
     * @notice Add a new hook for a specific module and function selector
     * @dev Registers a hook that can execute before and/or after a function call
     * @param module Address of the module that will implement the hook
     * @param selector Function selector that the hook will target
     * @param entityId Identifier for the entity associated with this hook
     * @param isPre Whether this hook should run before the target function
     * @param isPost Whether this hook should run after the target function
     */
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
            if (config.preHooks.length() >= MAX_HOOK_COUNT) TooManyHooks.selector.revertWith();
            config.preHooks.add(hookId);
        }

        if (isPost) {
            if (config.postHooks.length() >= MAX_HOOK_COUNT) TooManyHooks.selector.revertWith();
            config.postHooks.add(hookId);
        }

        emit HookAdded(module, selector, entityId, isPre, isPost);
    }

    /**
     * @notice Remove a hook for a specific module and function selector
     * @dev Completely removes the hook from storage
     * @param module Address of the module implementing the hook
     * @param selector Function selector that the hook is targeting
     * @param entityId Identifier for the entity associated with this hook
     */
    function _removeHook(address module, bytes4 selector, uint32 entityId) internal {
        HookConfig storage config = _getConfig(module, selector);
        bytes32 hookId = _entityId(module, entityId);

        if (!config.isHookActive(hookId)) HookDoesNotExist.selector.revertWith();

        config.removeHook(hookId, selector);

        emit HookRemoved(module, selector, entityId);
    }

    /**
     * @notice Execute all pre-execution hooks for a function
     * @dev Calls all registered pre-hooks and stores any returned data for later use in post-hooks
     * @param module Address of the module being called
     * @param selector Function selector being called
     * @param value Value being sent with the call
     * @param data Function call data
     */
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

    /**
     * @notice Execute all post-execution hooks for a function
     * @dev Calls all registered post-hooks with any data stored from pre-hooks
     * @param module Address of the module being called
     * @param selector Function selector being called
     */
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

    /**
     * @notice Get all hooks for a specific module and function selector
     * @dev Returns an array of Hook structs for either pre or post hooks
     * @param module Address of the module
     * @param selector Function selector
     * @param isPre Whether to get pre-hooks (true) or post-hooks (false)
     * @return hooks Array of Hook structs
     */
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

    /**
     * @notice Check if a specific hook exists for a module and function selector
     * @dev Verifies if a hook exists and is registered as either pre or post hook
     * @param module Address of the module
     * @param selector Function selector
     * @param entityId Identifier for the entity
     * @param isPre Whether to check for pre-hooks (true) or post-hooks (false)
     * @return bool True if the hook exists, false otherwise
     */
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

    /**
     * @notice Generate a unique ID for a module and selector combination
     * @dev Used as a key in the hooks mapping
     * @param target Address of the target module
     * @param selector Function selector
     * @return bytes32 Unique identifier
     */
    function _configId(address target, bytes4 selector) internal pure returns (bytes32) {
        return keccak256(abi.encode(target, selector));
    }

    /**
     * @notice Generate a unique ID for a module and entity combination
     * @dev Used to identify a specific hook
     * @param module Address of the module
     * @param entity Entity identifier
     * @return bytes32 Unique identifier
     */
    function _entityId(address module, uint32 entity) internal pure returns (bytes32) {
        return keccak256(abi.encode(module, entity));
    }

    /**
     * @notice Get the hook configuration for a specific module and selector
     * @dev Retrieves the HookConfig from storage
     * @param module Address of the module
     * @param selector Function selector
     * @return config The hook configuration storage struct
     */
    function _getConfig(
        address module,
        bytes4 selector
    ) internal view virtual returns (HookConfig storage config) {
        bytes32 id = _configId(module, selector);
        config = ExecutorStorage.getLayout().hooks[id];
    }
}
