// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface ILockBase {
    /// @notice Emitted when the lock is updated.
    /// @param account The account that was updated.
    /// @param enabled Whether the lock is enabled.
    /// @param expiration The expiration of the lock.
    event LockUpdated(address indexed account, bool indexed enabled, uint256 expiration);

    error LockNotAuthorized();
}

interface ILock is ILockBase {
    /// @notice Enables the lock for the given account.
    /// @param account The account to enable the lock for.
    function enableLock(address account) external;

    /// @notice Disables the lock and starts the cooldown for the given account.
    /// @param account The account to disable the lock for.
    function disableLock(address account) external;

    /// @notice Returns whether the lock is active for the given account.
    /// @param account The account to check the lock for.
    /// @return true if the lock is active
    function isLockActive(address account) external view returns (bool);

    /// @notice Returns the expiration of the lock for the given account.
    /// @param account The account to check the lock expiration for.
    /// @return The expiration timestamp.
    function lockExpiration(address account) external view returns (uint256);

    /// @notice Sets the default cooldown for the lock.
    /// @param cooldown The cooldown in seconds.
    function setLockCooldown(uint256 cooldown) external;
}
