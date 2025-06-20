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
        ExactInputParams calldata params,
        RouterParams calldata routerParams,
        address poster
    ) external payable nonReentrant returns (uint256 amountOut) {
        address swapRouter = _validateSwapPrerequisites();

        // create mutable copy in memory to modify amountIn for fee-on-transfer tokens
        ExactInputParams memory paramsMemory = params;

        // handle ERC20 transfers before calling SwapRouter
        bool isNativeToken = params.tokenIn == CurrencyTransfer.NATIVE_TOKEN;

        if (!isNativeToken) {
            // use the actual received amount to handle fee-on-transfer tokens
            uint256 tokenInBalanceBefore = params.tokenIn.balanceOf(address(this));
            params.tokenIn.safeTransferFrom(msg.sender, address(this), params.amountIn);
            // update amountIn based on the actual balance after transfer
            paramsMemory.amountIn = params.tokenIn.balanceOf(address(this)) - tokenInBalanceBefore;

            // approve SwapRouter to spend the tokens
            params.tokenIn.safeApprove(swapRouter, paramsMemory.amountIn);
        }

        // execute swap through the router
        // forwarding `msg.value` may introduce double-spending if used with `multicall`
        // which has been handled by Solady Multicallable
        uint256 protocolFee;
        (amountOut, protocolFee) = ISwapRouter(swapRouter).executeSwap{value: msg.value}(
            paramsMemory,
            routerParams,
            _resolveSwapPoster(poster)
        );

        // post-swap processing (points minting and events)
        _afterSwap(params, amountOut, protocolFee, poster);

        // reset approval for ERC20 tokens
        if (!isNativeToken) params.tokenIn.safeApprove(swapRouter, 0);
    }

    /// @inheritdoc ISwapFacet
    function executeSwapWithPermit(
        ExactInputParams calldata params,
        RouterParams calldata routerParams,
        Permit2Params calldata permit,
        address poster
    ) external payable nonReentrant returns (uint256 amountOut) {
        // Permit2 swaps do not support ETH
        if (msg.value != 0) SwapFacet__UnexpectedETH.selector.revertWith();

        address swapRouter = _validateSwapPrerequisites();

        // execute swap through the router with permit
        uint256 protocolFee;
        (amountOut, protocolFee) = ISwapRouter(swapRouter).executeSwapWithPermit(
            params,
            routerParams,
            permit,
            _resolveSwapPoster(poster)
        );

        // post-swap processing (points minting and events)
        // no approval reset needed since Permit2 handles token transfers
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

    /// @notice Post-swap processing: mint points for ETH swaps and emit events
    /// @param params The swap parameters for event emission
    /// @param amountOut The amount of output tokens received
    /// @param protocolFee The protocol fee collected for points calculation
    /// @param poster The original poster address (for event)
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
            poster // use original poster for the event
        );
    }

    /// @notice Validates swap prerequisites (membership and SwapRouter availability)
    /// @return swapRouter The address of the SwapRouter to use
    function _validateSwapPrerequisites() internal view returns (address swapRouter) {
        _validateMembership(msg.sender);

        swapRouter = getSwapRouter();
        if (swapRouter == address(0)) SwapFacet__SwapRouterNotSet.selector.revertWith();
    }

    function _getSpaceFactory() internal view returns (address) {
        return MembershipStorage.layout().spaceFactory;
    }

    function _getPlatformRequirements() internal view returns (IPlatformRequirements) {
        return IPlatformRequirements(_getSpaceFactory());
    }

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
