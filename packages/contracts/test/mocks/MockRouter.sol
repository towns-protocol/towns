// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {MockERC20} from "./MockERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {CurrencyTransfer} from "src/utils/libraries/CurrencyTransfer.sol";

contract MockRouter {
    function swap(
        address tokenIn,
        MockERC20 tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) external payable returns (uint256) {
        if (tokenIn != CurrencyTransfer.NATIVE_TOKEN) {
            IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        }
        tokenOut.mint(msg.sender, minAmountOut);
        return minAmountOut;
    }
}
