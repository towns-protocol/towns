// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
interface IAccountBase {
    /// @notice Params for installing a module
    /// @param allowance The maximum amount of ETH that can be spent by the module
    /// @param grantDelay The delay before the module can be granted access to the group
    /// @param executionDelay The delay before the module can execute a transaction
    struct ModuleParams {
        uint256 allowance;
        uint32 grantDelay;
        uint32 executionDelay;
    }
}

interface IAccount is IAccountBase {
    function installModule(
        bytes32 moduleId,
        bytes calldata data,
        ModuleParams calldata params
    ) external;
}
