// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISwapRouter, ISwapRouterBase} from "../../../base/swap/ISwapRouter.sol";
import {ISwapFacet} from "./ISwapFacet.sol";

// libraries
import {SwapFacetStorage} from "./SwapFacetStorage.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";

// contracts
import {Entitled} from "../Entitled.sol";
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {ReentrancyGuardTransient} from "solady/utils/ReentrancyGuardTransient.sol";

/// @title SwapFacet
/// @notice Facet for executing swaps within a space
contract SwapFacet is ISwapFacet, Facet, ReentrancyGuardTransient, Entitled {
    using CustomRevert for bytes4;

    /// @notice The permission required to use swap functionality
    string internal constant SWAP_PERMISSION = "swap";

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          ADMIN API                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Sets the swap router address
    /// @param router The address of the swap router
    function setSwapRouter(address router) external {
        _validatePermission("admin");
        SwapFacetStorage.layout().swapRouter = router;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          READ API                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc ISwapFacet
    function getSwapRouter() external view returns (address) {
        return SwapFacetStorage.layout().swapRouter;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          SWAP API                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc ISwapFacet
    function executeSwap(
        ExactInputParams calldata params,
        RouterParams calldata routerParams,
        address poster
    ) external payable nonReentrant returns (uint256 amountOut) {
        // Validate membership and permission
        _validateEntitlement();

        address swapRouter = SwapFacetStorage.layout().swapRouter;
        if (swapRouter == address(0)) {
            SwapFacet__SwapRouterNotSet.selector.revertWith();
        }

        // Execute swap through the router
        try
            ISwapRouter(swapRouter).executeSwap{value: msg.value}(params, routerParams, poster)
        returns (uint256 returnedAmount) {
            // Emit event for successful swap
            emit SwapExecuted(
                params.tokenIn,
                params.tokenOut,
                params.amountIn,
                returnedAmount,
                params.recipient == address(0) ? msg.sender : params.recipient,
                poster
            );
            return returnedAmount;
        } catch {
            SwapFacet__SwapFailed.selector.revertWith();
        }
    }

    /// @inheritdoc ISwapFacet
    function executeSwapWithPermit(
        ExactInputParams calldata params,
        RouterParams calldata routerParams,
        PermitParams calldata permit,
        address poster
    ) external payable nonReentrant returns (uint256 amountOut) {
        // Validate membership and permission
        _validateEntitlement();

        address swapRouter = SwapFacetStorage.layout().swapRouter;
        if (swapRouter == address(0)) {
            SwapFacet__SwapRouterNotSet.selector.revertWith();
        }

        // Execute swap through the router with permit
        try
            ISwapRouter(swapRouter).executeSwapWithPermit{value: msg.value}(
                params,
                routerParams,
                permit,
                poster
            )
        returns (uint256 returnedAmount) {
            // Emit event for successful swap
            emit SwapExecuted(
                params.tokenIn,
                params.tokenOut,
                params.amountIn,
                returnedAmount,
                params.recipient == address(0) ? msg.sender : params.recipient,
                poster
            );
            return returnedAmount;
        } catch {
            SwapFacet__SwapFailed.selector.revertWith();
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         INTERNAL                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Validates that the caller is entitled to use swap functionality
    function _validateEntitlement() internal view {
        // Check if the user is a member and has swap permission
        _validateMembership(msg.sender);
        _validatePermission(SWAP_PERMISSION, msg.sender);
    }
}
