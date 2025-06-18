// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

import {IEntryPoint, SimpleAccount} from "account-abstraction/samples/SimpleAccount.sol";

/// @title SimulationAccount
/// @dev Modified SimpleAccount for bundle simulation that returns execution results and allows calls from any address
contract SimulationAccount is SimpleAccount {
    struct ExecutionResult {
        bool success;
        bytes returnData;
    }

    constructor(IEntryPoint anEntryPoint) SimpleAccount(anEntryPoint) {}

    /// @dev Execute a sequence of transactions and return results
    /// @param dest an array of destination addresses
    /// @param value an array of values to pass to each call. can be zero-length for no-value calls
    /// @param func an array of calldata to pass to each call
    /// @return results array of execution results
    function executeBatchWithResults(
        address[] calldata dest,
        uint256[] calldata value,
        bytes[] calldata func
    ) external returns (ExecutionResult[] memory results) {
        require(
            dest.length == func.length && (value.length == 0 || value.length == func.length),
            "wrong array lengths"
        );

        results = new ExecutionResult[](dest.length);

        if (value.length == 0) {
            for (uint256 i; i < dest.length; ++i) {
                (results[i].success, results[i].returnData) = dest[i].call(func[i]);
            }
        } else {
            for (uint256 i; i < dest.length; ++i) {
                (results[i].success, results[i].returnData) = dest[i].call{value: value[i]}(
                    func[i]
                );
            }
        }
    }
}
