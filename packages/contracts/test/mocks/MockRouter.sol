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
        uint256 minAmountOut,
        address recipient
    ) external payable returns (uint256) {
        if (tokenIn != CurrencyTransfer.NATIVE_TOKEN) {
            tokenIn.safeTransferFrom(msg.sender, address(this), amountIn);
        } else {
            require(msg.value == amountIn, "Incorrect ETH amount");
        }

        if (tokenOut != CurrencyTransfer.NATIVE_TOKEN) {
            MockERC20(tokenOut).mint(recipient, minAmountOut);
        } else {
            recipient.safeTransferETH(minAmountOut);
        }
        return minAmountOut;
    }
}
