// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IExecutorBase {
  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           ERRORS                            */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
  error CallerAlreadyRegistered();
  error CallerNotRegistered();
  error ExecutionAlreadyRegistered();
  error ExecutionNotRegistered();
  error ExecutorCallFailed();
  error ExecutionNotFound();
  error UnauthorizedCall(address caller, address target, bytes4 selector);
  error AlreadyScheduled(bytes32 operationId);
  error NotScheduled(bytes32 operationId);
  error NotReady(bytes32 operationId);
  error Expired(bytes32 operationId);
  error UnauthorizedCancel(
    address sender,
    address caller,
    address target,
    bytes4 selector
  );
  error UnauthorizedRenounce(address account, uint64 groupId);
  error UnauthorizedTarget(address target);
  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           EVENTS                            */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
  event GroupAccessGranted(
    uint64 indexed groupId,
    address indexed account,
    uint32 delay,
    uint48 since,
    bool newMember
  );
  event GroupAccessRevoked(uint64 indexed groupId, address indexed account);
  event GroupGuardianSet(uint64 indexed groupId, uint256 guardian);
  event GroupGrantDelaySet(uint64 indexed groupId, uint32 delay);
  event TargetFunctionGroupSet(
    address indexed target,
    bytes4 indexed selector,
    uint64 indexed groupId
  );
  event TargetFunctionDelaySet(
    address indexed target,
    uint32 newDelay,
    uint32 minSetback
  );
  event TargetFunctionDisabledSet(address indexed target, bool disabled);
  event OperationScheduled(
    bytes32 indexed operationId,
    uint48 timepoint,
    uint48 nonce
  );
  event OperationExecuted(bytes32 indexed operationId, uint32 nonce);
  event OperationCanceled(bytes32 indexed operationId, uint32 nonce);
}

interface IExecutor is IExecutorBase {
  /**
   * @notice Grants access to a group for an account with a delay
   * @param groupId The group ID
   * @param account The account to grant access to
   * @param delay The delay for the access to be effective
   * @return newMember Whether the account is a new member of the group
   */
  function grantAccess(
    uint64 groupId,
    address account,
    uint32 delay
  ) external returns (bool newMember);

  /**
   * @notice Checks if an account has access to a group
   * @param groupId The group ID
   * @param account The account to check access for
   * @return isMember Whether the account is a member of the group
   * @return executionDelay The delay for the access to be effective
   */
  function hasAccess(
    uint64 groupId,
    address account
  ) external view returns (bool isMember, uint32 executionDelay);

  /**
   * @notice Gets the access information for an account in a group
   * @param groupId The group ID
   * @param account The account to get access information for
   * @return since The timestamp when the access was granted
   * @return currentDelay The current delay for the access
   * @return pendingDelay The pending delay for the access
   * @return effect The effect of the access
   */
  function getAccess(
    uint64 groupId,
    address account
  )
    external
    view
    returns (
      uint48 since,
      uint32 currentDelay,
      uint32 pendingDelay,
      uint48 effect
    );

  /**
   * @notice Revokes access to a group for an account
   * @param groupId The group ID
   * @param account The account to revoke access from
   */
  function revokeAccess(uint64 groupId, address account) external;

  /**
   * @notice Renounces access to a group for an account
   * @param groupId The group ID
   * @param account The account to renounce access from
   */
  function renounceAccess(uint64 groupId, address account) external;

  /**
   * @notice Sets the guardian role for a group
   * @param groupId The group ID
   * @param guardian The guardian role ID
   */
  function setGuardian(uint64 groupId, uint64 guardian) external;

  /**
   * @notice Sets the grant delay for a group
   * @param groupId The group ID
   * @param delay The delay for granting access
   */
  function setGroupDelay(uint64 groupId, uint32 delay) external;

  /**
   * @notice Gets the grant delay for a group
   * @param groupId The group ID
   * @return The grant delay
   */
  function getGroupDelay(uint64 groupId) external view returns (uint32);

  /**
   * @notice Sets the group ID for a target function
   * @param target The target contract address
   * @param selector The function selector
   * @param groupId The group ID
   */
  function setTargetFunctionGroup(
    address target,
    bytes4 selector,
    uint64 groupId
  ) external;

  /**
   * @notice Disables or enables a target contract
   * @param target The target contract address
   * @param disabled Whether the target should be disabled
   */
  function setTargetFunctionDisabled(address target, bool disabled) external;

  /**
   * @notice Gets the scheduled timepoint for an operation
   * @param id The operation ID
   * @return The scheduled timepoint, or 0 if not scheduled or expired
   */
  function getSchedule(bytes32 id) external view returns (uint48);

  /**
   * @notice Schedules an operation for future execution
   * @param target The target contract address
   * @param data The calldata for the operation
   * @param when The timestamp when the operation can be executed
   * @return operationId The unique identifier for the operation
   * @return nonce The operation nonce
   */
  function scheduleOperation(
    address target,
    bytes calldata data,
    uint48 when
  ) external payable returns (bytes32 operationId, uint32 nonce);

  /**
   * @notice Hashes an operation
   * @param caller The caller address
   * @param target The target contract address
   * @param data The calldata for the operation
   * @return The hash of the operation
   */
  function hashOperation(
    address caller,
    address target,
    bytes calldata data
  ) external pure returns (bytes32);

  /**
   * @notice Executes an operation immediately or after delay
   * @param target The target contract address
   * @param data The calldata for the operation
   * @return nonce The operation nonce if scheduled, 0 if immediate
   */
  function execute(
    address target,
    bytes calldata data
  ) external payable returns (uint32 nonce);

  /**
   * @notice Cancels a scheduled operation
   * @param caller The account that scheduled the operation
   * @param target The target contract address
   * @param data The calldata for the operation
   * @return nonce The operation nonce
   */
  function cancel(
    address caller,
    address target,
    bytes calldata data
  ) external returns (uint32 nonce);
}
