// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC6900ExecutionModule} from
    "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {IERC6900Module} from "@erc6900/reference-implementation/interfaces/IERC6900Module.sol";
import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";

// libraries

// contracts

interface ITownsModule is IERC6900Module, IERC6900ExecutionModule {
    /// @notice Returns the name of the module
    /// @return name The name of the module
    function moduleName() external view returns (string memory);

    /// @notice Returns the required permissions for the module
    /// @return permissions The required permissions for the module
    function requiredPermissions() external view returns (bytes32[] memory);
}
