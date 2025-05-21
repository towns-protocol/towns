// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IPlatformRequirements} from "../factory/facets/platform/requirements/IPlatformRequirements.sol";
import {IArchitect} from "../factory/facets/architect/IArchitect.sol";
import {ISwapFacet} from "../spaces/facets/swap/ISwapFacet.sol";
import {ISwapRouter} from "./ISwapRouter.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";

// libraries
import {BasisPoints} from "../utils/libraries/BasisPoints.sol";
import {CurrencyTransfer} from "../utils/libraries/CurrencyTransfer.sol";
import {CustomRevert} from "../utils/libraries/CustomRevert.sol";
import {SwapRouterStorage} from "./SwapRouterStorage.sol";
import {LibCall} from "solady/utils/LibCall.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {PausableBase} from "@towns-protocol/diamond/src/facets/pausable/PausableBase.sol";
import {ReentrancyGuardTransient} from "solady/utils/ReentrancyGuardTransient.sol";

/// @title SwapRouter
/// @notice Handles swaps through whitelisted routers with fee collection
contract SwapRouter is PausableBase, ReentrancyGuardTransient, ISwapRouter, Facet {
    using CustomRevert for bytes4;
    using SafeTransferLib for address;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       ADMIN FUNCTIONS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Initializes the SwapRouter with the space factory address
    /// @param spaceFactory The address of the space factory
    function __SwapRouter_init(address spaceFactory) external onlyInitializing {
        SwapRouterStorage.layout().spaceFactory = spaceFactory;
        emit SwapRouterInitialized(spaceFactory);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                            SWAP                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc ISwapRouter
    function executeSwap(
        ExactInputParams calldata params,
        RouterParams calldata routerParams,
        address poster
    ) external payable nonReentrant whenNotPaused returns (uint256 amountOut, uint256 protocolFee) {
        // for standard swaps, the msg.sender provides the tokens
        return _executeSwap(params, routerParams, msg.sender, poster);
    }

    /// @inheritdoc ISwapRouter
    //    function executeSwapWithPermit(
    //        ExactInputParams calldata params,
    //        RouterParams calldata routerParams,
    //        PermitParams calldata permit,
    //        address poster
    //    ) external payable nonReentrant whenNotPaused returns (uint256 amountOut) {
    //        // sanity check
    //        if (permit.value < params.amountIn) SwapRouter__InvalidAmount.selector.revertWith();
    //
    //        _permit(params.tokenIn, permit);
    //
    //        // execute the swap with the permit owner as the payer
    //        return _executeSwap(params, routerParams, permit.owner, poster);
    //    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          GETTERS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc ISwapRouter
    function getETHInputFees(
        uint256 amountIn,
        address caller,
        address poster
    ) external view returns (uint256 amountInAfterFees, uint256 protocolFee, uint256 posterFee) {
        address spaceFactory = _getSpaceFactory();

        // get fee rates based on whether the caller is a space
        (uint16 protocolBps, uint16 posterBps) = _getSwapFees(spaceFactory, caller);

        // calculate fees and amount after fees
        return _calculateSwapFees(amountIn, protocolBps, posterBps, poster);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          INTERNAL                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Internal function to execute a swap with a specified payer
    /// @param params The parameters for the swap
    /// @param routerParams The router parameters for the swap
    /// @param payer The address providing the input tokens
    /// @param poster The address that posted this swap opportunity
    /// @return amountOut The amount of tokenOut received
    /// @return protocolFee The protocol fee amount
    function _executeSwap(
        ExactInputParams calldata params,
        RouterParams calldata routerParams,
        address payer,
        address poster
    ) internal returns (uint256 amountOut, uint256 protocolFee) {
        // only allow whitelisted routers
        if (!_isRouterWhitelisted(routerParams.router)) {
            SwapRouter__InvalidRouter.selector.revertWith();
        }
        if (!_isRouterWhitelisted(routerParams.approveTarget)) {
            SwapRouter__InvalidRouter.selector.revertWith();
        }

        // use `msg.sender` as recipient if not specified
        address recipient = params.recipient == address(0) ? msg.sender : params.recipient;

        // snapshot the balance of tokenOut before the swap
        uint256 balanceBefore = _getBalance(params.tokenOut);

        bool isNativeToken = params.tokenIn == CurrencyTransfer.NATIVE_TOKEN;
        {
            uint256 value;
            uint256 amountIn = params.amountIn;

            if (!isNativeToken) {
                // ensure no ETH is sent when tokenIn is not native
                if (msg.value != 0) SwapRouter__UnexpectedETH.selector.revertWith();

                // use the actual received amount to handle fee-on-transfer tokens
                uint256 tokenInBalanceBefore = params.tokenIn.balanceOf(address(this));
                params.tokenIn.safeTransferFrom(payer, address(this), amountIn);
                amountIn = params.tokenIn.balanceOf(address(this)) - tokenInBalanceBefore;

                params.tokenIn.safeApprove(routerParams.approveTarget, amountIn);
            } else {
                // for native token, the value should be sent with the transaction
                if (msg.value != amountIn) SwapRouter__InvalidAmount.selector.revertWith();

                // calculate and collect fees before the swap for ETH input
                (value, protocolFee, ) = _collectFees(
                    CurrencyTransfer.NATIVE_TOKEN,
                    msg.value,
                    poster
                );
            }

            // execute swap with the router
            LibCall.callContract(routerParams.router, value, routerParams.swapData);

            // reset approval for tokenIn
            if (!isNativeToken) {
                params.tokenIn.safeApprove(routerParams.approveTarget, 0);
            }
        }

        // use the actual received amount to handle fee-on-transfer tokens
        amountOut = _getBalance(params.tokenOut) - balanceBefore;

        // calculate and distribute fees only for non-ETH inputs
        // for ETH inputs, fees were already collected before the swap
        if (!isNativeToken) {
            (amountOut, protocolFee, ) = _collectFees(params.tokenOut, amountOut, poster);
        }

        // slippage check after fees
        if (amountOut < params.minAmountOut) SwapRouter__InsufficientOutput.selector.revertWith();

        // transfer remaining tokens to the recipient
        CurrencyTransfer.transferCurrency(params.tokenOut, address(this), recipient, amountOut);

        emit Swap(
            routerParams.router,
            msg.sender,
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            amountOut,
            recipient
        );
    }

    /// @dev Calls the `permit` function of the ERC20 token
    /// @param token The address of the ERC20 token
    /// @param permit The permit parameters
    function _permit(address token, PermitParams calldata permit) internal {
        bytes4 selector = IERC20Permit.permit.selector;
        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(fmp, selector)
            // copy permit params to memory
            calldatacopy(add(fmp, 0x04), permit, 0xe0)
            if iszero(call(gas(), token, 0, fmp, 0xe4, 0, 0)) {
                returndatacopy(0, 0, returndatasize())
                revert(0, returndatasize())
            }
        }
    }

    /// @notice Collects and distributes both protocol and poster fees
    /// @param token The token to collect fees in
    /// @param amount The amount to calculate fees from
    /// @param poster The address that posted this swap opportunity
    /// @return amountAfterFees The amount after deducting protocol and poster fees
    /// @return protocolFee The protocol fee amount collected
    /// @return posterFee The poster fee amount collected
    function _collectFees(
        address token,
        uint256 amount,
        address poster
    ) internal returns (uint256 amountAfterFees, uint256 protocolFee, uint256 posterFee) {
        address spaceFactory = _getSpaceFactory();
        (uint16 protocolBps, uint16 posterBps) = _getSwapFees(spaceFactory, msg.sender);

        // calculate fees
        (amountAfterFees, protocolFee, posterFee) = _calculateSwapFees(
            amount,
            protocolBps,
            posterBps,
            poster
        );

        // transfer fees
        address feeRecipient = IPlatformRequirements(spaceFactory).getFeeRecipient();
        CurrencyTransfer.transferCurrency(token, address(this), feeRecipient, protocolFee);

        if (posterFee > 0) {
            CurrencyTransfer.transferCurrency(token, address(this), poster, posterFee);
        }

        emit FeeDistribution(token, feeRecipient, poster, protocolFee, posterFee);
    }

    function _getSwapFees(
        address spaceFactory,
        address caller
    ) internal view returns (uint16 protocolBps, uint16 posterBps) {
        // check if caller is a space
        bool isSpace = IArchitect(spaceFactory).getTokenIdBySpace(caller) != 0;

        // get fee configuration based on whether caller is a space
        if (isSpace) {
            try ISwapFacet(caller).getSwapFees() returns (
                uint16 spaceTreasuryBps,
                uint16 spacePosterBps,
                bool
            ) {
                return (spaceTreasuryBps, spacePosterBps);
            } catch {}
            // fallback to platform fees if the space doesn't implement getSwapFees
        }
        IPlatformRequirements platform = IPlatformRequirements(spaceFactory);
        return platform.getSwapFees();
    }

    function _getSpaceFactory() internal view returns (address) {
        return SwapRouterStorage.layout().spaceFactory;
    }

    function _getPlatformRequirements() internal view returns (IPlatformRequirements) {
        return IPlatformRequirements(_getSpaceFactory());
    }

    /// @notice Checks if a router is whitelisted
    /// @param router The address to check
    /// @return bool True if the router is whitelisted
    function _isRouterWhitelisted(address router) internal view returns (bool) {
        return _getPlatformRequirements().isRouterWhitelisted(router);
    }

    /// @notice Gets the balance of a token for this contract
    /// @param token The token to check
    /// @return uint256 The balance
    function _getBalance(address token) internal view returns (uint256) {
        if (token == CurrencyTransfer.NATIVE_TOKEN) {
            return address(this).balance;
        }
        return token.balanceOf(address(this));
    }

    /// @notice Calculates swap fees and the amount after fees
    /// @param amount The original amount to calculate fees from
    /// @param protocolBps Protocol fee in basis points
    /// @param posterBps Poster fee in basis points
    /// @param poster The address that posted this swap opportunity
    /// @return amountAfterFees The amount after deducting protocol and poster fees
    /// @return protocolFee The protocol fee amount computed
    /// @return posterFee The poster fee amount computed
    function _calculateSwapFees(
        uint256 amount,
        uint16 protocolBps,
        uint16 posterBps,
        address poster
    ) internal pure returns (uint256 amountAfterFees, uint256 protocolFee, uint256 posterFee) {
        if (protocolBps + posterBps > BasisPoints.MAX_BPS) {
            SwapRouter__InvalidBps.selector.revertWith();
        }

        // calculate protocol fee
        protocolFee = BasisPoints.calculate(amount, protocolBps);

        // only calculate poster fee if the address is not zero
        if (poster != address(0)) {
            posterFee = BasisPoints.calculate(amount, posterBps);
        }

        // calculate amount after fees
        unchecked {
            amountAfterFees = amount - protocolFee - posterFee;
        }
    }
}
