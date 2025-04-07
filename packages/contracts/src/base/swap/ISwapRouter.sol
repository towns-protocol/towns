// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface ISwapRouterBase {
    // Errors
    error SwapRouter__InvalidRouter();
    error SwapRouter__InvalidAmount();
    error SwapRouter__SwapFailed();
    error SwapRouter__InsufficientOutput();

    // Events
    event Swap(
        address indexed router,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address recipient
    );
}

interface ISwapRouter is ISwapRouterBase {
    /// @notice Executes a swap through a whitelisted router
    /// @param router The address of the router to use
    /// @param approveTarget The address to approve the token transfer
    /// @param tokenIn The token being sold
    /// @param tokenOut The token being bought
    /// @param amountIn The amount of tokenIn to swap
    /// @param minAmountOut The minimum amount of tokenOut to receive
    /// @param poster The address that posted this swap opportunity
    /// @param swapData The calldata to execute on the router
    /// @return amountOut The amount of tokenOut received
    function executeSwap(
        address router,
        address approveTarget,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address poster,
        bytes calldata swapData
    )
        external
        payable
        returns (uint256 amountOut);
}
