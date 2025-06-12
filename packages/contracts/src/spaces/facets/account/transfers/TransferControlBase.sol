// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// Internal libraries
import {TransferControlStorage} from "./TransferControlStorage.sol";
import {CustomRevert} from "../../../../utils/libraries/CustomRevert.sol";
import {CurrencyTransfer} from "../../../../utils/libraries/CurrencyTransfer.sol";
import {ITransferControlBase, SpendingLimits} from "./ITransferControl.sol";

abstract contract TransferControlBase is ITransferControlBase {
    using CustomRevert for bytes4;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       CORE TRANSFER LOGIC                  */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Request a transfer of ETH or ERC20 tokens
    /// @dev Must be called during authorized execution context
    /// @param token Token address (NATIVE_TOKEN for ETH)
    /// @param to Recipient address
    /// @param amount Amount to transfer
    /// @return success Whether the transfer was successful
    function _requestTransfer(
        address app,
        address token,
        address to,
        uint256 amount
    ) internal returns (bool success) {
        if (amount == 0) return true;

        // Normalize token address (convert address(0) to NATIVE_TOKEN for consistency)
        address normalizedToken = token == address(0) ? CurrencyTransfer.NATIVE_TOKEN : token;

        // Validate and update spending limits
        _validateAndUpdateSpending(app, normalizedToken, amount);

        // Execute transfer
        _executeTransfer(normalizedToken, to, amount);

        emit TransferRequested(app, normalizedToken, to, amount);
        return true;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       SPENDING CONTROL                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _validateAndUpdateSpending(address app, address token, uint256 amount) internal {
        TransferControlStorage.Layout storage $ = TransferControlStorage.getLayout();

        if (!$.transferControlEnabled) return;

        // Check if token is supported
        if (!$.allowedTokens[token]) {
            UnsupportedToken.selector.revertWith(token);
        }

        // Get effective spending limits
        SpendingLimits memory limits = _getEffectiveLimits(app, token);
        if (!limits.enabled) return;

        // Validate per-transaction limit
        if (amount > limits.maxPerTransaction) {
            SpendingLimitExceeded.selector.revertWith();
        }

        // Get spending tracker
        SpendingLimits storage tracker = $.limitsByApp[app][token];

        // Reset period if needed
        _resetSpendingPeriodIfNeeded(app, token, limits.resetPeriod, tracker);

        // Validate period limit
        uint256 newPeriodTotal = tracker.spentInPeriod + amount;
        if (newPeriodTotal > limits.maxPerPeriod) {
            PeriodSpendingLimitExceeded.selector.revertWith();
        }

        // Update tracker
        tracker.spentInPeriod = newPeriodTotal;

        emit SpendingRecorded(app, token, amount, newPeriodTotal, limits.maxPerPeriod);
    }

    function _getEffectiveLimits(
        address app,
        address token
    ) internal view returns (SpendingLimits memory) {
        TransferControlStorage.Layout storage $ = TransferControlStorage.getLayout();

        SpendingLimits memory appLimits = $.limitsByApp[app][token];

        // If app has custom limits (indicated by enabled flag or maxPerTransaction > 0)
        if (appLimits.enabled || appLimits.maxPerTransaction > 0) {
            return appLimits;
        }

        // Return default limits for this token
        return $.limitsByToken[token];
    }

    function _resetSpendingPeriodIfNeeded(
        address app,
        address token,
        uint32 resetPeriod,
        SpendingLimits storage tracker
    ) internal {
        uint48 currentTime = uint48(block.timestamp);

        // Initialize period if first spend
        if (tracker.periodStart == 0) {
            tracker.periodStart = currentTime;
            return;
        }

        // Reset if period expired
        if (currentTime >= tracker.periodStart + resetPeriod) {
            tracker.spentInPeriod = 0;
            tracker.periodStart = currentTime;

            emit SpendingPeriodReset(app, token, currentTime);
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       TRANSFER EXECUTION                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _executeTransfer(address token, address to, uint256 amount) internal {
        // Validate sufficient balance
        _validateSufficientBalance(token, amount);

        // Execute transfer using CurrencyTransfer library
        CurrencyTransfer.transferCurrency(token, address(this), to, amount);
    }

    function _validateSufficientBalance(address token, uint256 amount) internal view {
        uint256 balance;

        if (token == CurrencyTransfer.NATIVE_TOKEN) {
            balance = address(this).balance;
        } else {
            // For ERC20 tokens, get balance from token contract
            balance = _getTokenBalance(token);
        }

        if (balance < amount) {
            InsufficientBalance.selector.revertWith();
        }
    }

    function _validateLimits(SpendingLimits calldata limits) internal pure {
        if (limits.enabled) {
            if (limits.maxPerTransaction == 0 || limits.maxPerPeriod == 0) {
                InvalidLimits.selector.revertWith();
            }
            if (limits.maxPerTransaction > limits.maxPerPeriod) {
                InvalidLimits.selector.revertWith();
            }
            if (limits.resetPeriod == 0) {
                InvalidLimits.selector.revertWith();
            }
        }
    }

    function _getTokenBalance(address token) internal view returns (uint256) {
        // Use low-level call to avoid importing IERC20
        bytes memory data = abi.encodeWithSignature("balanceOf(address)", address(this));
        (bool success, bytes memory result) = token.staticcall(data);

        if (!success || result.length < 32) {
            return 0;
        }

        return abi.decode(result, (uint256));
    }
}
