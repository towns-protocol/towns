// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// libraries
import {DMGatingMod} from "./DMGatingMod.sol";

/// @title IDMGating
/// @notice Interface for the DM Gating facet
/// @dev Allows users to control who can DM them via installable criteria modules
interface IDMGating {
    /// @notice Install a criteria module
    /// @param criteria The address of the criteria contract to install
    /// @param data Initialization data for the criteria
    function installCriteria(address criteria, bytes calldata data) external;

    /// @notice Uninstall a criteria module
    /// @param criteria The address of the criteria contract to uninstall
    function uninstallCriteria(address criteria) external;

    /// @notice Set the combination mode for evaluating criteria
    /// @param mode The combination mode (AND or OR)
    function setCombinationMode(DMGatingMod.CombinationMode mode) external;

    /// @notice Check if a sender can DM the caller
    /// @param sender The address attempting to send a DM
    /// @param extraData Additional context data for evaluation
    /// @return True if sender is allowed to DM
    function canReceiveDMFrom(
        address sender,
        bytes calldata extraData
    ) external view returns (bool);

    /// @notice Get all installed criteria for the caller
    /// @return Array of installed criteria addresses
    function getInstalledCriteria() external view returns (address[] memory);

    /// @notice Check if a criteria is installed for the caller
    /// @param criteria The address of the criteria to check
    /// @return True if the criteria is installed
    function isCriteriaInstalled(address criteria) external view returns (bool);

    /// @notice Get the combination mode for the caller
    /// @return The current combination mode
    function getCombinationMode() external view returns (DMGatingMod.CombinationMode);
}
