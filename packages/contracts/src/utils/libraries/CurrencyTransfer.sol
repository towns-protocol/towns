// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces
import {IWETH} from "../interfaces/IWETH.sol";

// libraries
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {CustomRevert} from "./CustomRevert.sol";

library CurrencyTransfer {
    using SafeTransferLib for address;
    using CustomRevert for bytes4;

    /// @dev The address interpreted as native token of the chain.
    address internal constant NATIVE_TOKEN = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    /// @dev The ETH transfer has failed.
    error ETHTransferFailed();

    /// @dev The ERC20 `transferFrom` has failed.
    error TransferFromFailed();

    /// @dev The ERC20 `transfer` has failed.
    error TransferFailed();

    /// @dev The `msg.value` does not match the amount.
    error MsgValueMismatch();

    /// @dev Transfers a given amount of currency.
    /// @param currency The currency to transfer.
    /// @param from The address to transfer from.
    /// @param to The address to transfer to.
    /// @param amount The amount to transfer.
    function transferCurrency(address currency, address from, address to, uint256 amount) internal {
        if (amount == 0) return;

        if (currency != NATIVE_TOKEN) safeTransferERC20(currency, from, to, amount);
        else safeTransferNativeToken(to, amount);
    }

    /// @dev Transfers a given amount of currency. (With native token wrapping)
    /// @param currency The currency to transfer.
    /// @param from The address to transfer from.
    /// @param to The address to transfer to.
    /// @param amount The amount to transfer.
    /// @param _nativeTokenWrapper The address of the native token wrapper.
    function transferCurrencyWithWrapper(
        address currency,
        address from,
        address to,
        uint256 amount,
        address _nativeTokenWrapper
    ) internal {
        if (amount == 0) return;

        if (currency == NATIVE_TOKEN) {
            if (from == address(this)) {
                IWETH(_nativeTokenWrapper).withdraw(amount);
                safeTransferNativeTokenWithWrapper(to, amount, _nativeTokenWrapper);
            } else {
                if (amount != msg.value) MsgValueMismatch.selector.revertWith();

                if (to == address(this)) IWETH(_nativeTokenWrapper).deposit{value: msg.value}();
                else safeTransferNativeTokenWithWrapper(to, msg.value, _nativeTokenWrapper);
            }
        } else {
            safeTransferERC20(currency, from, to, amount);
        }
    }

    /// @dev Transfer `amount` of ERC20 token from `from` to `to`.
    function safeTransferERC20(address token, address from, address to, uint256 amount) internal {
        if (from == to) return;

        if (from != address(this)) token.safeTransferFrom(from, to, amount);
        else token.safeTransfer(to, amount);
    }

    /// @dev Transfers `amount` of native token to `to`.
    function safeTransferNativeToken(address to, uint256 value) internal {
        to.safeTransferETH(value);
    }

    /// @dev Transfers `amount` of native token to `to`. (With native token wrapping)
    function safeTransferNativeTokenWithWrapper(
        address to,
        uint256 value,
        address _nativeTokenWrapper
    ) internal {
        bool success = to.trySafeTransferETH(value, gasleft());
        if (!success) {
            IWETH(_nativeTokenWrapper).deposit{value: value}();
            _nativeTokenWrapper.safeTransfer(to, value);
        }
    }

    /// @notice Transfers fee amount and refunds excess native token
    /// @dev For native tokens, the subtraction maxPaid - actualFee will underflow and revert if actualFee > maxPaid.
    /// @param currency The currency (address(0) for native)
    /// @param payer The payer to refund
    /// @param recipient The fee recipient
    /// @param actualFee The actual fee amount to charge
    /// @param maxPaid The maximum amount paid (msg.value)
    function transferFeeWithRefund(
        address currency,
        address payer,
        address recipient,
        uint256 actualFee,
        uint256 maxPaid
    ) internal {
        if (currency == NATIVE_TOKEN) {
            // Transfer fee to recipient if non-zero
            if (actualFee > 0) safeTransferNativeToken(recipient, actualFee);

            // NOTE: uint256 underflow here (maxPaid - actualFee) will revert if actualFee > maxPaid,
            // acting as a slippage check (never over-withdraws from msg.value).
            uint256 refund = maxPaid - actualFee;
            if (refund > 0) safeTransferNativeToken(payer, refund);
        } else {
            // ERC20: only transfer if actualFee > 0
            if (actualFee > 0) safeTransferERC20(currency, payer, recipient, actualFee);
        }
    }

    /// @dev Returns the balance of `account` in `currency`.
    function balanceOf(address currency, address account) internal view returns (uint256) {
        if (currency == NATIVE_TOKEN) return account.balance;
        return currency.balanceOf(account);
    }
}
