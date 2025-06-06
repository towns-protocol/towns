// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ITownsPointsBase} from "../../../airdrop/points/ITownsPoints.sol";
import {IPlatformRequirements} from "../../../factory/facets/platform/requirements/IPlatformRequirements.sol";
import {IImplementationRegistry} from "../../../factory/facets/registry/IImplementationRegistry.sol";
import {ISwapRouter, ISwapRouterBase} from "../../../router/ISwapRouter.sol";
import {ISwapFacet} from "./ISwapFacet.sol";

// libraries
import {CurrencyTransfer} from "../../../utils/libraries/CurrencyTransfer.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {BasisPoints} from "../../../utils/libraries/BasisPoints.sol";
import {MembershipBase} from "../membership/MembershipBase.sol";
import {MembershipStorage} from "../membership/MembershipStorage.sol";
import {SwapFacetStorage} from "./SwapFacetStorage.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";

// contracts
import {Entitled} from "../Entitled.sol";
import {PointsBase} from "../points/PointsBase.sol";
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {ReentrancyGuardTransient} from "solady/utils/ReentrancyGuardTransient.sol";

/// @title SwapFacet
/// @notice Facet for executing swaps within a space
contract SwapFacet is
    ISwapFacet,
    ReentrancyGuardTransient,
    Entitled,
    MembershipBase,
    PointsBase,
    Facet
{
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
    function setSwapFeeConfig(
        uint16 posterFeeBps,
        bool collectPosterFeeToSpace
    ) external onlyOwner {
        // get protocol fee for validation
        IPlatformRequirements platform = _getPlatformRequirements();
        (uint16 protocolBps, ) = platform.getSwapFees();

        // ensure total fee is reasonable
        if (protocolBps + posterFeeBps > MAX_FEE_BPS) {
            SwapFacet__TotalFeeTooHigh.selector.revertWith();
        }

        SwapFacetStorage.Layout storage ds = SwapFacetStorage.layout();
        (ds.posterFeeBps, ds.collectPosterFeeToSpace) = (posterFeeBps, collectPosterFeeToSpace);

        emit SwapFeeConfigUpdated(posterFeeBps, collectPosterFeeToSpace);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                            SWAP                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc ISwapFacet
    function executeSwap(
        ExactInputParams memory params,
        RouterParams calldata routerParams,
        address poster
    ) external payable nonReentrant returns (uint256 amountOut) {
        _validateMembership(msg.sender);

        address swapRouter = getSwapRouter();
        if (swapRouter == address(0)) {
            SwapFacet__SwapRouterNotSet.selector.revertWith();
        }

        // handle ERC20 transfers before calling SwapRouter
        bool isNativeToken = params.tokenIn == CurrencyTransfer.NATIVE_TOKEN;
        if (!isNativeToken) {
            // use the actual received amount to handle fee-on-transfer tokens
            uint256 tokenInBalanceBefore = params.tokenIn.balanceOf(address(this));
            params.tokenIn.safeTransferFrom(msg.sender, address(this), params.amountIn);
            // update amountIn based on the actual balance after transfer
            params.amountIn = params.tokenIn.balanceOf(address(this)) - tokenInBalanceBefore;

            // approve SwapRouter to spend the tokens
            params.tokenIn.safeApprove(swapRouter, params.amountIn);
        }

        // handle poster based on collectPosterFeeToSpace
        address actualPoster = _resolveSwapPoster(poster);

        // execute swap through the router
        // forwarding `msg.value` may introduce double-spending if used with `multicall`
        // which has been handled by Solady Multicallable
        try
            ISwapRouter(swapRouter).executeSwap{value: msg.value}(
                params,
                routerParams,
                actualPoster
            )
        returns (uint256 returnedAmount, uint256 protocolFee) {
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
                returnedAmount,
                poster // use original poster for the event
            );

            // reset approval
            if (!isNativeToken) {
                params.tokenIn.safeApprove(swapRouter, 0);
            }
            return returnedAmount;
        } catch {
            SwapFacet__SwapFailed.selector.revertWith();
        }
    }

    /// @inheritdoc ISwapFacet
    //    function executeSwapWithPermit(
    //        ExactInputParams calldata params,
    //        RouterParams calldata routerParams,
    //        PermitParams calldata permit,
    //        address poster
    //    ) external payable nonReentrant returns (uint256 amountOut) {
    //        _validateMembership(msg.sender);
    //
    //        address swapRouter = getSwapRouter();
    //        if (swapRouter == address(0)) {
    //            SwapFacet__SwapRouterNotSet.selector.revertWith();
    //        }
    //
    //        // handle poster based on collectPosterFeeToSpace
    //        address actualPoster = _resolveSwapPoster(poster);
    //
    //        // execute swap through the router with permit
    //        try
    //            ISwapRouter(swapRouter).executeSwapWithPermit{value: msg.value}(
    //                params,
    //                routerParams,
    //                permit,
    //                actualPoster
    //            )
    //        returns (uint256 returnedAmount) {
    //            // emit event for successful swap
    //            emit SwapExecuted(
    //                params.recipient,
    //                params.tokenIn,
    //                params.tokenOut,
    //                params.amountIn,
    //                returnedAmount,
    //                poster // use original poster for the event
    //            );
    //            return returnedAmount;
    //        } catch {
    //            SwapFacet__SwapFailed.selector.revertWith();
    //        }
    //    }

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
        external
        view
        returns (uint16 protocolBps, uint16 posterBps, bool collectPosterFeeToSpace)
    {
        SwapFacetStorage.Layout storage ds = SwapFacetStorage.layout();

        // get protocolBps and posterBps from protocol config
        IPlatformRequirements platform = _getPlatformRequirements();
        (protocolBps, posterBps) = platform.getSwapFees();

        collectPosterFeeToSpace = ds.collectPosterFeeToSpace;

        uint16 spacePosterBps = ds.posterFeeBps;
        if (collectPosterFeeToSpace) {
            posterBps = spacePosterBps;
        } else {
            // if spacePosterBps is not set, use protocol config
            posterBps = spacePosterBps == 0 ? posterBps : spacePosterBps;
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         INTERNAL                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Resolves the actual poster address based on the space's fee configuration
    /// @param poster The original poster address
    /// @return The actual poster address to use
    function _resolveSwapPoster(address poster) internal view returns (address) {
        // if fees should be collected to space, return the space address
        if (SwapFacetStorage.layout().collectPosterFeeToSpace) {
            return address(this);
        }
        // if collectPosterFeeToSpace is false, return the poster as-is
        // (including address(0) which will skip poster fee)
        return poster;
    }
}
