// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface IGuardianBase {
    event GuardianUpdated(
        address indexed caller,
        bool indexed enabled,
        uint256 cooldown,
        uint256 timestamp
    );

    event GuardianDefaultCooldownUpdated(uint256 indexed cooldown);

    error Guardian_Enabled();
    error Guardian_AlreadyEnabled();
    error Guardian_AlreadyDisabled();
}

interface IGuardian is IGuardianBase {
    /// @notice Enables the guardian mode for the caller
    /// @dev Can only be called by an EOA (Externally Owned Account)
    /// @dev Emits a GuardianUpdated event
    function enableGuardian() external;

    /// @notice Disables the guardian mode for the caller
    /// @dev Can only be called by an EOA (Externally Owned Account)
    /// @dev Emits a GuardianUpdated event
    function disableGuardian() external;

    /// @notice Returns the cooldown period for a specific guardian
    /// @param guardian The address of the guardian to check
    /// @return The cooldown period in seconds
    function guardianCooldown(address guardian) external view returns (uint256);

    /// @notice Checks if guardian mode is enabled for a specific address
    /// @param guardian The address to check
    /// @return True if guardian mode is enabled, false otherwise
    function isGuardianEnabled(address guardian) external view returns (bool);

    /// @notice Returns the default cooldown period
    /// @return The default cooldown period in seconds
    function getDefaultCooldown() external view returns (uint256);

    /// @notice Sets the default cooldown period
    /// @dev Can only be called by the contract owner
    /// @param cooldown The new default cooldown period in seconds
    function setDefaultCooldown(uint256 cooldown) external;
}
