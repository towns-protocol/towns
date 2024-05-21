// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface ILockBase {
  error LockAlreadyEnabled();
  error LockAlreadyDisabled();
  error LockNotAuthorized();

  event LockUpdated(
    address indexed caller,
    bool indexed enabled,
    uint256 cooldown,
    uint256 timestamp
  );
}

interface ILock is ILockBase {
  /**
   * @notice enable lock for the caller
   * @param account address to enable lock for
   */
  function enableLock(address account) external;

  /**
   * @notice disable lock for the caller
   * @param account address to disable lock for
   */
  function disableLock(address account) external;

  /**
   * @notice check if lock is enabled for an account
   * @param account address to check
   * @return true if lock is enabled
   */
  function isLockEnabled(address account) external view returns (bool);

  /**
   * @notice get the lock cooldown for an account
   * @param account address to check
   * @return cooldown in seconds
   */
  function lockCooldown(address account) external view returns (uint256);

  /**
   * @notice set the default lock cooldown
   * @param cooldown cooldown in seconds
   */
  function setLockCooldown(uint256 cooldown) external;
}
