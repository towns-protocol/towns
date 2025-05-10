// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";

/*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
/*                           STRUCTS                           */
/*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

/**
 * @title Hook
 * @notice Represents a single hook in the system
 * @dev Hooks are used to execute logic before or after function calls
 * @param module The address of the module that implements the hook logic
 * @param entityId The identifier for the entity associated with this hook
 * @param isActive Whether this hook is currently active
 */
struct Hook {
    address module;
    uint32 entityId;
    bool isActive;
}

/**
 * @title HookConfig
 * @notice Configuration for hooks associated with a specific function selector
 * @dev Stores all hooks and their data for both pre and post execution
 * @custom:field preHooks Set of hook IDs that execute before the target function
 * @custom:field postHooks Set of hook IDs that execute after the target function
 * @custom:field preHookData Data returned from pre-hooks, accessible to post-hooks
 * @custom:field hookData Storage for all hook metadata
 */
struct HookConfig {
    EnumerableSetLib.Bytes32Set preHooks;
    EnumerableSetLib.Bytes32Set postHooks;
    mapping(bytes4 selector => mapping(bytes32 entityId => bytes)) preHookData;
    mapping(bytes32 entityId => Hook) hookData;
}

/*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
/*                       BASE INTERFACE                       */
/*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

/**
 * @title IHookBase
 * @author Towns Protocol Team
 * @notice Interface for the hook system used in the executor
 * @dev Defines the errors and events for hook management
 */
interface IHookBase {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /**
     * @notice Thrown when attempting to add a hook that already exists
     */
    error HookAlreadyExists();

    /**
     * @notice Thrown when attempting to remove a hook that doesn't exist
     */
    error HookDoesNotExist();

    /**
     * @notice Thrown when attempting to add more hooks than the allowed maximum
     */
    error TooManyHooks();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /**
     * @notice Emitted when a new hook is added to the system
     * @param module Address of the module implementing the hook
     * @param selector Function selector the hook is targeting
     * @param entityId Identifier for the entity associated with this hook
     * @param isPre Whether this hook is set to execute before the target function
     * @param isPostHook Whether this hook is set to execute after the target function
     */
    event HookAdded(
        address indexed module,
        bytes4 indexed selector,
        uint32 indexed entityId,
        bool isPre,
        bool isPostHook
    );

    /**
     * @notice Emitted when a hook is removed from the system
     * @param module Address of the module implementing the hook
     * @param selector Function selector the hook was targeting
     * @param entityId Identifier for the entity associated with this hook
     */
    event HookRemoved(address indexed module, bytes4 indexed selector, uint32 indexed entityId);
}
