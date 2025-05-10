// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {LibCall} from "solady/utils/LibCall.sol";

// types
import {HookConfig, Hook} from "./IHookBase.sol";

// contracts

/**
 * @title HookLib
 * @notice Library for managing hooks in the executor system
 * @dev Provides core functionality for creating, removing, and checking the status of hooks
 *      Hooks provide a mechanism for modules to inject custom logic before and after function execution
 */
library HookLib {
    using EnumerableSetLib for EnumerableSetLib.Bytes32Set;

    /**
     * @notice Check if a hook is currently active
     * @param self The hook configuration storage
     * @param hookId The unique identifier of the hook
     * @return bool True if the hook is active, false otherwise
     */
    function isHookActive(HookConfig storage self, bytes32 hookId) internal view returns (bool) {
        return self.hookData[hookId].isActive;
    }

    /**
     * @notice Create a new hook
     * @dev Sets the hook as active in storage
     * @param self The hook configuration storage
     * @param hookId The unique identifier for the new hook (derived from module and entity ID)
     * @param module The address of the module implementing the hook
     * @param entityId The ID of the entity associated with the hook
     */
    function createHook(
        HookConfig storage self,
        bytes32 hookId,
        address module,
        uint32 entityId
    ) internal {
        self.hookData[hookId] = Hook({module: module, entityId: entityId, isActive: true});
    }

    /**
     * @notice Remove a hook from the system
     * @dev Completely removes the hook data and its connections to both pre and post hook sets
     * @param self The hook configuration storage
     * @param hookId The unique identifier of the hook to remove
     * @param selector The function selector associated with the hook
     */
    function removeHook(HookConfig storage self, bytes32 hookId, bytes4 selector) internal {
        delete self.hookData[hookId];
        delete self.preHookData[selector][hookId];
        self.preHooks.remove(hookId);
        self.postHooks.remove(hookId);
    }
}
