// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC6900ExecutionModule} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {IERC6900Module} from "@erc6900/reference-implementation/interfaces/IERC6900Module.sol";
import {IERC173} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";

/// @title ITownsApp Interface
/// @notice Base interface for Towns apps implementing core module functionality
/// @dev Combines IERC173 (ownership), IERC6900Module (module lifecycle), and IERC6900ExecutionModule (execution)
/// @dev Apps must implement required permissions and support these interfaces
interface ITownsApp is IERC173, IERC6900Module, IERC6900ExecutionModule {
    /// @notice Returns the required permissions for the module
    /// @return permissions The required permissions for the module
    function requiredPermissions() external view returns (bytes32[] memory);
}
