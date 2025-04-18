// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {ISwapRouterBase} from "../../../base/swap/ISwapRouter.sol";

interface ISwapFacetBase {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Error thrown when the swap router address is not set
    error SwapFacet__SwapRouterNotSet();

    /// @notice Error thrown when a swap execution fails
    error SwapFacet__SwapFailed();

    /// @notice Error thrown when the total fee exceeds the maximum allowed
    error SwapFacet__TotalFeeTooHigh();

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
    /// @param collectPosterFeeToSpace Whether the poster fee is collected to the space
    event SwapFeeConfigUpdated(uint16 posterFeeBps, bool collectPosterFeeToSpace);
}

interface ISwapFacet is ISwapFacetBase, ISwapRouterBase {
    /// @notice Set the swap fee configuration for this space
    /// @param posterFeeBps Poster fee in basis points
    /// @param collectPosterFeeToSpace Whether to collect the poster fee to the space instead of the poster
    function setSwapFeeConfig(uint16 posterFeeBps, bool collectPosterFeeToSpace) external;

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

    /// @notice Execute a swap with EIP-2612 permit
    /// @param params The parameters for the swap
    /// @param routerParams The router parameters for the swap
    /// @param permit The permit data for token approval
    /// @param poster The address that posted this swap opportunity
    /// @return amountOut The amount of tokenOut received
    function executeSwapWithPermit(
        ExactInputParams calldata params,
        RouterParams calldata routerParams,
        PermitParams calldata permit,
        address poster
    ) external payable returns (uint256 amountOut);

    /// @notice Get the current swap router address
    /// @return The address of the swap router
    function getSwapRouter() external view returns (address);

    /// @notice Get the swap fees for this space
    /// @return treasuryBps Treasury fee in basis points (from protocol config)
    /// @return posterBps Poster fee in basis points (space specific)
    /// @return collectPosterFeeToSpace Whether the poster fee is collected to the space
    function getSwapFees()
        external
        view
        returns (uint16 treasuryBps, uint16 posterBps, bool collectPosterFeeToSpace);
}
