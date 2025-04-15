// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface ISwapRouterBase {
    struct ExactInputParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        address recipient;
    }

    struct PermitParams {
        address owner;
        address spender;
        uint256 value;
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    error SwapRouter__InvalidRouter();
    error SwapRouter__InvalidAmount();
    error SwapRouter__SwapFailed();
    error SwapRouter__InsufficientOutput();
    error SwapRouter__PermitFailed();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

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
    /// @param params The parameters for the swap including tokens, amounts, and recipient
    /// tokenIn The token being sold
    /// tokenOut The token being bought
    /// amountIn The amount of tokenIn to swap
    /// minAmountOut The minimum amount of tokenOut to receive
    /// recipient The address to receive the output tokens
    /// @param router The address of the router to use
    /// @param approveTarget The address to approve the token transfer
    /// @param swapData The calldata to execute on the router
    /// @param poster The address that posted this swap opportunity
    /// @return amountOut The amount of tokenOut received
    function executeSwap(
        ExactInputParams calldata params,
        address router,
        address approveTarget,
        bytes calldata swapData,
        address poster
    ) external payable returns (uint256 amountOut);

    /// @notice Executes a swap using EIP-2612 permit for token approval
    /// @param params The parameters for the swap
    /// @param router The address of the router to use
    /// @param approveTarget The address to approve the token transfer
    /// @param swapData The calldata to execute on the router
    /// @param permit The EIP-2612 permit data for token approval
    /// @param poster The address that posted this swap opportunity
    /// @return amountOut The amount of tokenOut received
    function executeSwapWithPermit(
        ExactInputParams calldata params,
        address router,
        address approveTarget,
        bytes calldata swapData,
        PermitParams calldata permit,
        address poster
    ) external payable returns (uint256 amountOut);
}
