// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

/// @title ICriteria
/// @notice Interface for DM gating criteria modules
/// @dev Criteria modules evaluate whether a sender should be allowed to DM a recipient
interface ICriteria {
    /// @notice Check if sender can DM the recipient
    /// @param sender The address attempting to send a DM
    /// @param recipient The address of the DM recipient (smart account)
    /// @param extraData Additional context data for evaluation
    /// @return allowed True if sender is allowed to DM recipient
    function canDM(
        address sender,
        address recipient,
        bytes calldata extraData
    ) external view returns (bool allowed);

    /// @notice Get the name of this criteria module
    /// @return The human-readable name of the criteria
    function name() external view returns (string memory);

    /// @notice Called when criteria is installed on an account
    /// @param account The account installing this criteria
    /// @param data Initialization data for the criteria
    function onInstall(address account, bytes calldata data) external;

    /// @notice Called when criteria is uninstalled from an account
    /// @param account The account uninstalling this criteria
    function onUninstall(address account) external;
}
