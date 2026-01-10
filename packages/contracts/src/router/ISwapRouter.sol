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

    /// @notice Parameters for Permit2 signature transfer with witness
    /// @dev Token and amount are derived from ExactInputParams
    /// @param owner The owner of the tokens (who signed the permit)
    /// @param nonce The permit nonce
    /// @param deadline The permit deadline
    /// @param signature The permit signature
    struct Permit2Params {
        address owner;
        uint256 nonce;
        uint256 deadline;
        bytes signature;
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

    /// @notice Fee configuration for permit-based swaps
    /// @param recipient The address that should receive the fee
    /// @param feeBps The expected fee in basis points
    struct FeeConfig {
        address recipient;
        uint16 feeBps;
    }

    struct SwapWitness {
        ExactInputParams exactInputParams;
        RouterParams routerParams;
        FeeConfig feeConfig;
    }

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

    /// @notice Error thrown when an invalid BPS value is provided
    error SwapRouter__InvalidBps();

    /// @notice Error thrown when native token is used with permit (not supported)
    error SwapRouter__NativeTokenNotSupportedWithPermit();

    /// @notice Error thrown when recipient is not specified (address(0))
    error SwapRouter__RecipientRequired();

    /// @notice Error thrown when tokenIn and tokenOut are the same
    error SwapRouter__SameToken();

    /// @notice Error thrown when the poster fee in permit doesn't match the actual configured fee
    error SwapRouter__PosterFeeMismatch();
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

    /// @notice Executes a swap using Permit2 with witness data binding permit to swap intent
    /// @dev Uses Uniswap's Permit2 protocol with witness binding for enhanced security.
    /// Integration flow:
    /// 1. User approves tokens to Permit2 contract (0x000000000022D473030F116dDEE9F6B43aC78BA3)
    /// 2. Frontend generates permit signature using getPermit2MessageHash()
    /// 3. Frontend calls this function with signed permit
    /// @param params The exact input swap parameters that will be bound to the permit signature
    /// @param routerParams The router interaction parameters that will be bound to the permit signature
    /// @param permit The Permit2 data containing owner, nonce, deadline, and signature
    /// @param posterFee The fee configuration including poster address and expected poster fee rate (included in witness)
    /// @return amountOut The amount of output tokens received after fees
    /// @return protocolFee The amount of protocol fee collected
    function executeSwapWithPermit(
        ExactInputParams calldata params,
        RouterParams calldata routerParams,
        FeeConfig calldata posterFee,
        Permit2Params calldata permit
    ) external payable returns (uint256 amountOut, uint256 protocolFee);

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

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        PERMIT2 UTILS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Get the next available Permit2 nonce for a user from Permit2's bitmap system
    /// @dev Permit2 uses a bitmap system where each bit represents a nonce state (0=available, 1=used).
    /// Nonces are organized in 256-nonce "words" (uint256 bitmaps). This function efficiently searches
    /// through words starting from the one containing startNonce, using bit manipulation to find the
    /// first available nonce. The search continues across word boundaries until an available nonce is
    /// found or the maximum word position is reached.
    /// @param owner The address to check nonce availability for
    /// @param startNonce The nonce to start searching from (inclusive - will return this exact nonce if available)
    /// @return nonce The next available nonce at or after startNonce, or type(uint256).max if no nonces are available (stop flag)
    function getPermit2Nonce(
        address owner,
        uint256 startNonce
    ) external view returns (uint256 nonce);

    /// @notice Generate the EIP-712 message hash for Permit2 signature
    /// @dev Generates the exact hash that needs to be signed for permit-based swaps
    /// @param params Swap parameters that will be bound to permit signature
    /// @param routerParams Router parameters that will be bound to permit signature
    /// @param posterFee Fee configuration including poster address and expected poster fee rate (included in witness)
    /// @param amount Token amount to permit (should be >= params.amountIn)
    /// @param nonce Permit nonce (use getPermit2Nonce to find available nonce)
    /// @param deadline Permit deadline (unix timestamp)
    /// @return messageHash The EIP-712 message hash ready for signing
    function getPermit2MessageHash(
        ExactInputParams calldata params,
        RouterParams calldata routerParams,
        FeeConfig calldata posterFee,
        uint256 amount,
        uint256 nonce,
        uint256 deadline
    ) external view returns (bytes32 messageHash);
}
