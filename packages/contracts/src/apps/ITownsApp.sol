// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC6900ExecutionModule} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {IERC6900Module} from "@erc6900/reference-implementation/interfaces/IERC6900Module.sol";

/// @title ITownsApp Interface
/// @notice Base interface for Towns apps implementing core module functionality
/// @dev Combines IERC6900Module (module lifecycle), and IERC6900ExecutionModule (execution)
/// @dev Apps must implement required permissions and support these interfaces
interface ITownsApp is IERC6900Module, IERC6900ExecutionModule {
    /// @notice Returns the required permissions for the module
    /// @return permissions The required permissions for the module
    function requiredPermissions() external view returns (bytes32[] memory);

    /// @notice Returns the owner of the module
    /// @return owner The owner of the module
    function moduleOwner() external view returns (address);
}
