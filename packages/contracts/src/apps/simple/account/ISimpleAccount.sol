// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IEntryPoint} from "@eth-infinitism/account-abstraction/interfaces/IEntryPoint.sol";

// libraries

// contracts

interface ISimpleAccountBase {
    /// @notice Emitted when the entry point is updated
    /// @param oldEntryPoint The old entry point
    /// @param newEntryPoint The new entry point
    event EntryPointUpdated(address indexed oldEntryPoint, address indexed newEntryPoint);

    /// @notice Emitted when the coordinator is updated
    /// @param oldCoordinator The old coordinator
    /// @param newCoordinator The new coordinator
    event CoordinatorUpdated(address indexed oldCoordinator, address indexed newCoordinator);

    error SimpleAccount__NotFromTrustedCaller();
    error SimpleAccount__OpDataNotSupported();
}

interface ISimpleAccount is ISimpleAccountBase {
    /// @notice Updates the entry point of the account
    /// @param newEntryPoint The new entry point
    function updateEntryPoint(address newEntryPoint) external;

    /// @notice Updates the coordinator of the account
    /// @param newCoordinator The new coordinator
    function updateCoordinator(address newCoordinator) external;

    /// @notice Return the account nonce.
    /// @dev This method returns the next sequential nonce.
    /// @dev For a nonce of a specific key, use `entrypoint.getNonce(account, key)`
    /// @return The next sequential nonce.
    function getNonce() external view returns (uint256);
}
