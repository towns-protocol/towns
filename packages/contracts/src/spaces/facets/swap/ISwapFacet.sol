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

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Emitted when a swap is successfully executed through the space
    /// @param tokenIn The input token
    /// @param tokenOut The output token
    /// @param amountIn The amount of input tokens sold
    /// @param amountOut The amount of output tokens received
    /// @param recipient The address that received the output tokens
    /// @param poster The address that posted this swap opportunity
    event SwapExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address indexed recipient,
        address poster
    );
}

interface ISwapFacet is ISwapFacetBase, ISwapRouterBase {
    /// @notice Get the current swap router address
    /// @return The address of the swap router
    function getSwapRouter() external view returns (address);

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
}
