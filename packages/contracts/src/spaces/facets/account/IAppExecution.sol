// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces

// libraries

// contracts

interface IAppExecution {
    /// @notice Executes a function on the app
    /// @param target The address of the app to execute the function on
    /// @param value The value to send with the function
    /// @param data The data to send with the function
    /// @return The result of the function
    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external payable returns (bytes memory);

    /// @notice Checks if an app is executing
    /// @param app The address of the app to check
    /// @return True if the app is executing, false otherwise
    function isAppExecuting(address app) external view returns (bool);
}
