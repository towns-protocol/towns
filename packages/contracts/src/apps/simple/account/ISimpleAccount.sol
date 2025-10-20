// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IEntryPoint} from "@eth-infinitism/account-abstraction/interfaces/IEntryPoint.sol";

// libraries

// contracts

interface ISimpleAccountBase {
    error SimpleAccount__NotFromTrustedCaller();
}

interface ISimpleAccount is ISimpleAccountBase {
    /// @notice Return the entryPoint used by this account.
    function entryPoint() external view returns (IEntryPoint);

    /// @notice Return the account nonce.
    /// @dev This method returns the next sequential nonce.
    /// @dev For a nonce of a specific key, use `entrypoint.getNonce(account, key)`
    /// @return The next sequential nonce.
    function getNonce() external view returns (uint256);
}
