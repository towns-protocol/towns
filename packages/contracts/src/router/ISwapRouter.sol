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

    /// @notice Error thrown when ETH is sent but not expected (tokenIn is not the native token)
    error SwapRouter__UnexpectedETH();

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

    /// @notice Emitted when fees are distributed after a swap
    /// @param token The token in which fees are paid
    /// @param protocol The address receiving the protocol fee
    /// @param poster The address receiving the poster fee (if any)
    /// @param protocolAmount The amount of tokens sent as protocol fee
    /// @param posterAmount The amount of tokens sent to the poster
    event FeeDistribution(
        address indexed token,
        address indexed protocol,
        address indexed poster,
        uint256 protocolAmount,
        uint256 posterAmount
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
    /// @return protocolFee The amount of protocol fee collected
    function executeSwap(
        ExactInputParams calldata params,
        RouterParams calldata routerParams,
        address poster
    ) external payable returns (uint256 amountOut, uint256 protocolFee);

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

    /// @notice Calculate fees for ETH input swaps before execution
    /// @dev This function helps integrators determine the actual amount that will be sent to external
    /// routers after protocol and poster fees are deducted. Integration flow:
    /// 1. Call this function to get `amountInAfterFees`
    /// 2. Use `amountInAfterFees` to get quotes from aggregator
    /// 3. Construct RouterParams with the aggregator quote
    /// 4. Call executeSwap with original amountIn and the prepared RouterParams
    /// @param amountIn The original ETH amount before fees
    /// @param caller The address that will call executeSwap (to calculate correct fees based on space status)
    /// @param poster The address that posted this swap opportunity
    /// @return amountInAfterFees The ETH amount that will be sent to external router after fees
    /// @return protocolFee The amount collected as protocol fee
    /// @return posterFee The amount collected as poster fee
    function getETHInputFees(
        uint256 amountIn,
        address caller,
        address poster
    ) external view returns (uint256 amountInAfterFees, uint256 protocolFee, uint256 posterFee);
}
