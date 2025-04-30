// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface ISwapRouterBase {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          STRUCTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Parameters for an exact input swap
    /// @param tokenIn The input token
    /// @param tokenOut The output token
    /// @param amountIn The amount of input tokens to swap
    /// @param minAmountOut The minimum amount of output tokens to receive
    /// @param recipient The address to receive the output tokens
    struct ExactInputParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        address recipient;
    }

    /// @notice Parameters for EIP-2612 permit approval
    /// @param owner The owner of the tokens
    /// @param spender The spender being approved
    /// @param value The amount of tokens to approve
    /// @param deadline The timestamp until which the permit is valid
    /// @param v The recovery byte of the signature
    /// @param r The first 32 bytes of the signature
    /// @param s The second 32 bytes of the signature
    struct PermitParams {
        address owner;
        address spender;
        uint256 value;
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    /// @notice Parameters for external router interaction
    /// @param router The address of the router to use
    /// @param approveTarget The address to approve token transfers
    /// @param swapData The calldata to execute on the router
    struct RouterParams {
        address router;
        address approveTarget;
        bytes swapData;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Error thrown when an invalid router is specified
    error SwapRouter__InvalidRouter();

    /// @notice Error thrown when an invalid amount is provided
    error SwapRouter__InvalidAmount();

    /// @notice Error thrown when the output amount is less than the minimum expected
    error SwapRouter__InsufficientOutput();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Emitted when the SwapRouter is initialized
    /// @param spaceFactory The address of the space factory
    event SwapRouterInitialized(address spaceFactory);

    /// @notice Emitted when a swap is successfully executed
    /// @param router The address of the router used
    /// @param caller The address that initiated the swap
    /// @param tokenIn The input token
    /// @param tokenOut The output token
    /// @param amountIn The amount of input tokens sold
    /// @param amountOut The amount of output tokens received
    /// @param recipient The address that received the output tokens
    event Swap(
        address indexed router,
        address indexed caller,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address recipient
    );
}

interface ISwapRouter is ISwapRouterBase {
    /// @notice Executes a swap through a whitelisted router
    /// @param params The parameters for the swap
    /// tokenIn The token being sold
    /// tokenOut The token being bought
    /// amountIn The amount of tokenIn to swap
    /// minAmountOut The minimum amount of tokenOut to receive
    /// recipient The address to receive the output tokens
    /// @param routerParams The router parameters for the swap
    /// router The address of the router to use
    /// approveTarget The address to approve the token transfer
    /// swapData The calldata to execute on the router
    /// @param poster The address that posted this swap opportunity
    /// @return amountOut The amount of tokenOut received
    function executeSwap(
        ExactInputParams calldata params,
        RouterParams calldata routerParams,
        address poster
    ) external payable returns (uint256 amountOut);

    //    /// @notice Executes a swap using EIP-2612 permit for token approval
    //    /// @param params The parameters for the swap
    //    /// tokenIn The token being sold
    //    /// tokenOut The token being bought
    //    /// amountIn The amount of tokenIn to swap
    //    /// minAmountOut The minimum amount of tokenOut to receive
    //    /// recipient The address to receive the output tokens
    //    /// @param routerParams The router parameters for the swap
    //    /// router The address of the router to use
    //    /// approveTarget The address to approve the token transfer
    //    /// swapData The calldata to execute on the router
    //    /// @param permit The EIP-2612 permit data for token approval
    //    /// @param poster The address that posted this swap opportunity
    //    /// @return amountOut The amount of tokenOut received
    //    function executeSwapWithPermit(
    //        ExactInputParams calldata params,
    //        RouterParams calldata routerParams,
    //        PermitParams calldata permit,
    //        address poster
    //    ) external payable returns (uint256 amountOut);
}
