// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IAccount} from "@eth-infinitism/account-abstraction/interfaces/IAccount.sol";
import {IEntryPoint} from "@eth-infinitism/account-abstraction/interfaces/IEntryPoint.sol";
import {ISimpleAccountBase} from "./ISimpleAccount.sol";

// libraries
import {UserOperationLib, PackedUserOperation} from "@eth-infinitism/account-abstraction/core/UserOperationLib.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";

/// @title SimpleAccountBase
/// @notice Base contract for simple accounts implementing core ERC-6900 account functionality
abstract contract SimpleAccountBase is IAccount, ISimpleAccountBase {
    using UserOperationLib for PackedUserOperation;
    using CustomRevert for bytes4;

    /// @notice Return the entryPoint used by this account.
    /// @dev Subclass should return the current entryPoint used by this account.
    function entryPoint() public view virtual returns (IEntryPoint);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         Hooks                              */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev Internal function to validate the signature of the user operation.
    /// @param userOp The user operation to validate.
    /// @param userOpHash The hash of the user operation.
    /// @return validationData The validation data.
    function _validateSignature(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash
    ) internal virtual returns (uint256 validationData);

    /// @dev Internal function to pay the prefund.
    /// @param missingAccountFunds The missing account funds.
    function _payPrefund(uint256 missingAccountFunds) internal virtual {
        if (missingAccountFunds == 0) return;
        SafeTransferLib.safeTransferETH(msg.sender, missingAccountFunds);
    }

    /// @dev Internal function to require the sender to be the entry point.
    function _requireFromEntryPoint() internal view virtual {
        if (msg.sender != address(entryPoint()))
            SimpleAccount__NotFromTrustedCaller.selector.revertWith();
    }

    /// @dev Internal function to require the sender to be the entry point.
    function _requireForExecute() internal view virtual {
        _requireFromEntryPoint();
    }

    /// @dev Internal function to validate the nonce of the user operation.
    /// @param nonce The nonce of the user operation.
    function _validateNonce(uint256 nonce) internal view virtual {}
}
