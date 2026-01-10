// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {ISwapRouterBase} from "../../../router/ISwapRouter.sol";

interface ISwapFacetBase {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Emitted when a swap is successfully executed through the space
    /// @param recipient The address that received the output tokens
    /// @param tokenIn The input token
    /// @param tokenOut The output token
    /// @param amountIn The amount of input tokens sold
    /// @param amountOut The amount of output tokens received
    /// @param poster The address that posted this swap opportunity
    event SwapExecuted(
        address indexed recipient,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address poster
    );

    /// @notice Emitted when swap fee configuration is updated
    /// @param posterFeeBps Poster fee in basis points
    /// @param forwardPosterFee Whether to forward the poster fee to the poster (default: false, fees go to space)
    event SwapFeeConfigUpdated(uint16 posterFeeBps, bool forwardPosterFee);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Error thrown when the swap router address is not set
    error SwapFacet__SwapRouterNotSet();

    /// @notice Error thrown when the total fee exceeds the maximum allowed
    error SwapFacet__TotalFeeTooHigh();

    /// @notice Error thrown when ETH is sent with permit swap (not supported)
    error SwapFacet__UnexpectedETH();

    /// @notice Error thrown when poster address is invalid for the current fee configuration
    error SwapFacet__InvalidPosterInput();
}

interface ISwapFacet is ISwapFacetBase, ISwapRouterBase {
    /// @notice Set the swap fee configuration for this space
    /// @param posterFeeBps Poster fee in basis points
    /// @param forwardPosterFee Whether to forward the poster fee to the poster (default: false, fees go to space)
    function setSwapFeeConfig(uint16 posterFeeBps, bool forwardPosterFee) external;

    /// @notice Execute a swap within the space context
    /// @param params The parameters for the swap
    /// @param routerParams The router parameters for the swap
    /// @param poster The address that posted this swap opportunity
    /// @return amountOut The amount of tokenOut received
    function executeSwap(
        ExactInputParams calldata params,
        RouterParams calldata routerParams,
        address poster
    ) external payable returns (uint256 amountOut);

    /// @notice Execute a swap with Permit2 witness binding permit to swap intent
    /// @param params The parameters for the swap
    /// @param routerParams The router parameters for the swap
    /// @param permit The Permit2 permit data
    /// @param posterFee The fee configuration bound to the permit
    /// @return amountOut The amount of tokenOut received
    function executeSwapWithPermit(
        ExactInputParams calldata params,
        RouterParams calldata routerParams,
        FeeConfig calldata posterFee,
        Permit2Params calldata permit
    ) external payable returns (uint256 amountOut);

    /// @notice Get the current swap router address
    /// @return The address of the swap router
    function getSwapRouter() external view returns (address);

    /// @notice Get the swap fees for this space
    /// @return protocolBps Treasury fee in basis points (from protocol config)
    /// @return posterBps Poster fee in basis points (space specific)
    /// @return forwardPosterFee Whether the poster fee is forwarded to the poster (default: false, fees go to space)
    function getSwapFees()
        external
        view
        returns (uint16 protocolBps, uint16 posterBps, bool forwardPosterFee);
}
