// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ITownsPointsBase} from "../../../airdrop/points/ITownsPoints.sol";
import {IPlatformRequirements} from "../../../factory/facets/platform/requirements/IPlatformRequirements.sol";
import {IImplementationRegistry} from "../../../factory/facets/registry/IImplementationRegistry.sol";
import {ISwapRouter} from "../../../router/ISwapRouter.sol";
import {ISwapFacet} from "./ISwapFacet.sol";

// libraries
import {BasisPoints} from "../../../utils/libraries/BasisPoints.sol";
import {CurrencyTransfer} from "../../../utils/libraries/CurrencyTransfer.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {MembershipStorage} from "../membership/MembershipStorage.sol";
import {SwapFacetStorage} from "./SwapFacetStorage.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";

// contracts
import {Entitled} from "../Entitled.sol";
import {PointsBase} from "../points/PointsBase.sol";
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {ReentrancyGuardTransient} from "solady/utils/ReentrancyGuardTransient.sol";

/// @title SwapFacet
/// @notice Facet for executing swaps within a space
contract SwapFacet is ISwapFacet, ReentrancyGuardTransient, Entitled, PointsBase, Facet {
    using CustomRevert for bytes4;
    using SafeTransferLib for address;

    /// @notice Maximum fee in basis points (2%)
    uint16 internal constant MAX_FEE_BPS = 200;

    /// @dev The implementation ID for the SwapRouter
    bytes32 internal constant SWAP_ROUTER_DIAMOND = bytes32("SwapRouter");

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       ADMIN FUNCTIONS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc ISwapFacet
    function setSwapFeeConfig(uint16 posterFeeBps, bool forwardPosterFee) external onlyOwner {
        // get protocol fee for validation
        IPlatformRequirements platform = _getPlatformRequirements();
        (uint16 protocolBps, ) = platform.getSwapFees();

        // ensure total fee is reasonable
        if (protocolBps + posterFeeBps > MAX_FEE_BPS) {
            SwapFacet__TotalFeeTooHigh.selector.revertWith();
        }

        SwapFacetStorage.Layout storage ds = SwapFacetStorage.layout();
        (ds.posterFeeBps, ds.forwardPosterFee) = (posterFeeBps, forwardPosterFee);

        emit SwapFeeConfigUpdated(posterFeeBps, forwardPosterFee);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                            SWAP                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc ISwapFacet
    function executeSwap(
        ExactInputParams calldata params,
        RouterParams calldata routerParams,
        address poster
    ) external payable nonReentrant returns (uint256 amountOut) {
        address swapRouter = _validateSwapPrerequisites(poster);

        // create mutable copy in memory to modify amountIn for fee-on-transfer tokens
        ExactInputParams memory paramsMemory = params;

        // handle ERC20 transfers before calling SwapRouter
        bool isNativeToken = params.tokenIn == CurrencyTransfer.NATIVE_TOKEN;

        // take snapshot of balance BEFORE receiving user tokens for refund calculation
        uint256 tokenInBalanceBefore;
        if (!isNativeToken) {
            // use the actual received amount to handle fee-on-transfer tokens
            tokenInBalanceBefore = params.tokenIn.balanceOf(address(this));
            params.tokenIn.safeTransferFrom(msg.sender, address(this), params.amountIn);
            // update amountIn based on the actual balance after transfer
            paramsMemory.amountIn = params.tokenIn.balanceOf(address(this)) - tokenInBalanceBefore;

            // approve SwapRouter to spend the tokens
            params.tokenIn.safeApprove(swapRouter, paramsMemory.amountIn);
        } else {
            // for ETH, msg.value is already included in balance, so subtract it
            tokenInBalanceBefore = address(this).balance - msg.value;
        }

        // execute swap through the router
        // forwarding `msg.value` may introduce double-spending if used with `multicall`
        // which has been handled by Solady Multicallable
        uint256 protocolFee;
        (amountOut, protocolFee) = ISwapRouter(swapRouter).executeSwap{value: msg.value}(
            paramsMemory,
            routerParams,
            poster
        );

        // post-swap processing (points minting and events)
        _afterSwap(params, amountOut, protocolFee, poster);

        // handle refunds of unconsumed input tokens
        _handleRefunds(params.tokenIn, tokenInBalanceBefore);

        // reset approval for ERC20 tokens
        if (!isNativeToken) params.tokenIn.safeApprove(swapRouter, 0);
    }

    /// @inheritdoc ISwapFacet
    /// @dev Permit is forwarded directly to SwapRouter which handles all token operations,
    /// e.g. Permit2 transfers, approvals, refunds
    function executeSwapWithPermit(
        ExactInputParams calldata params,
        RouterParams calldata routerParams,
        Permit2Params calldata permit,
        address poster
    ) external payable nonReentrant returns (uint256 amountOut) {
        // Permit2 swaps do not support ETH
        if (msg.value != 0) SwapFacet__UnexpectedETH.selector.revertWith();

        address swapRouter = _validateSwapPrerequisites(poster);

        // execute swap through the router with permit
        uint256 protocolFee;
        (amountOut, protocolFee) = ISwapRouter(swapRouter).executeSwapWithPermit(
            params,
            routerParams,
            permit,
            poster
        );

        // post-swap processing (points minting and events)
        _afterSwap(params, amountOut, protocolFee, poster);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          GETTERS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc ISwapFacet
    function getSwapRouter() public view returns (address) {
        return
            IImplementationRegistry(_getSpaceFactory()).getLatestImplementation(
                SWAP_ROUTER_DIAMOND
            );
    }

    /// @inheritdoc ISwapFacet
    function getSwapFees()
        public
        view
        returns (uint16 protocolBps, uint16 posterBps, bool forwardPosterFee)
    {
        SwapFacetStorage.Layout storage ds = SwapFacetStorage.layout();

        // get protocolBps and posterBps from protocol config
        IPlatformRequirements platform = _getPlatformRequirements();
        (protocolBps, posterBps) = platform.getSwapFees();

        uint16 spacePosterBps;
        (spacePosterBps, forwardPosterFee) = (ds.posterFeeBps, ds.forwardPosterFee);

        // if poster fee is forwarded or spacePosterBps is set, use spacePosterBps
        if (forwardPosterFee || spacePosterBps != 0) posterBps = spacePosterBps;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         INTERNAL                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Post-swap processing: mint points for ETH swaps and emit events
    /// @param params The swap parameters for event emission
    /// @param amountOut The amount of output tokens received
    /// @param protocolFee The protocol fee collected for points calculation
    /// @param poster The swap poster address
    function _afterSwap(
        ExactInputParams calldata params,
        uint256 amountOut,
        uint256 protocolFee,
        address poster
    ) internal {
        // mint points based on the protocol fee if ETH is involved
        if (
            params.tokenIn == CurrencyTransfer.NATIVE_TOKEN ||
            params.tokenOut == CurrencyTransfer.NATIVE_TOKEN
        ) {
            address airdropDiamond = _getAirdropDiamond();
            uint256 points = _getPoints(
                airdropDiamond,
                ITownsPointsBase.Action.Swap,
                abi.encode(protocolFee)
            );
            _mintPoints(airdropDiamond, msg.sender, points);
        }

        emit SwapExecuted(
            params.recipient,
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            amountOut,
            poster
        );
    }

    /// @notice Handles refunds of unconsumed input tokens back to the caller
    /// @param tokenIn The input token address
    /// @param tokenInBalanceBefore The balance before receiving tokens from user
    function _handleRefunds(address tokenIn, uint256 tokenInBalanceBefore) internal {
        uint256 currentBalance = _getBalance(tokenIn);

        // calculate base refund amount
        uint256 refundAmount = FixedPointMathLib.zeroFloorSub(currentBalance, tokenInBalanceBefore);

        // for ETH, subtract poster fee if it was collected to space
        if (tokenIn == CurrencyTransfer.NATIVE_TOKEN && !_isForwardPosterFee()) {
            // get the poster fee that was collected to space
            (, uint16 posterBps, ) = getSwapFees();
            uint256 posterFee = BasisPoints.calculate(msg.value, posterBps);

            // subtract poster fee from refund since it should stay in space
            refundAmount = FixedPointMathLib.zeroFloorSub(refundAmount, posterFee);
        }

        CurrencyTransfer.transferCurrency(tokenIn, address(this), msg.sender, refundAmount);
    }

    /// @notice Validates swap prerequisites (membership, SwapRouter availability, and poster address)
    /// @param poster The poster address to validate
    /// @return swapRouter The address of the SwapRouter to use
    function _validateSwapPrerequisites(address poster) internal view returns (address swapRouter) {
        _validateMembership(msg.sender);

        swapRouter = getSwapRouter();
        if (swapRouter == address(0)) SwapFacet__SwapRouterNotSet.selector.revertWith();

        // validate poster address based on fee configuration
        if (!(_isForwardPosterFee() || poster == address(this))) {
            SwapFacet__InvalidPosterInput.selector.revertWith();
        }
    }

    function _getSpaceFactory() internal view returns (address) {
        return MembershipStorage.layout().spaceFactory;
    }

    function _getPlatformRequirements() internal view returns (IPlatformRequirements) {
        return IPlatformRequirements(_getSpaceFactory());
    }

    /// @notice Gets the balance of a token for this contract
    /// @param token The token to check
    /// @return uint256 The balance
    function _getBalance(address token) internal view returns (uint256) {
        if (token == CurrencyTransfer.NATIVE_TOKEN) return address(this).balance;
        return token.balanceOf(address(this));
    }

    /// @notice Checks if poster fees should be forwarded to the poster
    /// @return bool True if poster fees are forwarded, false if they go to the space
    function _isForwardPosterFee() internal view returns (bool) {
        return SwapFacetStorage.layout().forwardPosterFee;
    }
}
