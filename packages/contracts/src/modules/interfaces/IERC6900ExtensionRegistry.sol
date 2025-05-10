// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IERC6900ExtensionRegistry Interface
/// @notice Interface for managing attestation-based module validation for ERC-6900 accounts
interface IERC6900ExtensionRegistry {
    /// @notice Emitted when a account sets new trusted attesters
    /// @param account The address of the account that set new trusted attesters
    event NewTrustedAttesters(address indexed account);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*          Check with Registry internal attesters            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Checks if a module is validated by the caller's trusted attesters
    /// @param module The address of the module to check
    function check(address module) external view;

    /// @notice Checks if a module is validated by a account's trusted attesters
    /// @param account The address of the account to check for
    /// @param module The address of the module to check
    function checkForAccount(address account, address module) external view;

    /**
     * @notice Allows Accounts - the end users of the registry - to appoint
     * one or many attesters as trusted.
     * @dev this function reverts, if address(0), or duplicates are provided in attesters[]
     *
     * @param threshold The minimum number of attestations required for a module
     *                  to be considered secure.
     * @param attesters The addresses of the attesters to be trusted.
     */
    function trustAttesters(uint8 threshold, address[] calldata attesters) external;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*              Check with external attester(s)               */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Checks if a module is validated by specified external attesters
    /// @param module The address of the module to check
    /// @param attesters Array of attester addresses to check against
    /// @param threshold Minimum number of attestations required for validation
    function check(address module, address[] calldata attesters, uint256 threshold) external view;
}
