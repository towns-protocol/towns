// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {CurrencyTransfer} from "../../src/utils/libraries/CurrencyTransfer.sol";
import {MockERC20} from "./MockERC20.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";

contract MockRouter {
    using SafeTransferLib for address;

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address recipient
    ) external payable returns (uint256) {
        if (tokenIn != CurrencyTransfer.NATIVE_TOKEN) {
            tokenIn.safeTransferFrom(msg.sender, address(this), amountIn);
        } else {
            require(msg.value == amountIn, "Incorrect ETH amount");
        }

        if (tokenOut != CurrencyTransfer.NATIVE_TOKEN) {
            MockERC20(tokenOut).mint(recipient, amountOut);
        } else {
            recipient.safeTransferETH(amountOut);
        }
        return amountOut;
    }

    /// @notice Swap function that only consumes a portion of input tokens (for testing refunds)
    /// @param tokenIn Input token address
    /// @param tokenOut Output token address
    /// @param maxAmountIn Maximum amount of input tokens to consume
    /// @param actualAmountIn Actual amount of input tokens to consume (must be <= maxAmountIn)
    /// @param amountOut Amount of output tokens to provide
    /// @param recipient Address to receive output tokens
    function partialSwap(
        address tokenIn,
        address tokenOut,
        uint256 maxAmountIn,
        uint256 actualAmountIn,
        uint256 amountOut,
        address recipient
    ) external payable returns (uint256) {
        require(actualAmountIn <= maxAmountIn, "Cannot consume more than max");

        if (tokenIn != CurrencyTransfer.NATIVE_TOKEN) {
            // Only consume actualAmountIn, leaving the rest for refund
            tokenIn.safeTransferFrom(msg.sender, address(this), actualAmountIn);
        } else {
            require(msg.value == maxAmountIn, "Incorrect ETH amount");
            // For ETH, return excess to sender
            if (actualAmountIn < maxAmountIn) {
                msg.sender.safeTransferETH(maxAmountIn - actualAmountIn);
            }
        }

        if (tokenOut != CurrencyTransfer.NATIVE_TOKEN) {
            MockERC20(tokenOut).mint(recipient, amountOut);
        } else {
            recipient.safeTransferETH(amountOut);
        }
        return amountOut;
    }
}
