// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IPlatformRequirements} from "../../factory/facets/platform/requirements/IPlatformRequirements.sol";
import {ISwapRouter} from "./ISwapRouter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";

// libraries
import {BasisPoints} from "../../utils/libraries/BasisPoints.sol";
import {CurrencyTransfer} from "../../utils/libraries/CurrencyTransfer.sol";
import {CustomRevert} from "../../utils/libraries/CustomRevert.sol";
import {SwapRouterStorage} from "./SwapRouterStorage.sol";
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";

// contracts
import {ReentrancyGuardTransient} from "solady/utils/ReentrancyGuardTransient.sol";

/// @title SwapRouter
/// @notice Handles swaps through whitelisted routers with fee collection
contract SwapRouter is ReentrancyGuardTransient, ISwapRouter, Facet {
    using CustomRevert for bytes4;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                            SWAP                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc ISwapRouter
    function executeSwap(
        ExactInputParams calldata params,
        address router,
        address approveTarget,
        bytes calldata swapData,
        address poster
    ) external payable nonReentrant returns (uint256 amountOut) {
        // For standard swaps, the msg.sender provides the tokens
        return _executeSwap(params, router, approveTarget, swapData, msg.sender, poster);
    }

    /// @inheritdoc ISwapRouter
    function executeSwapWithPermit(
        ExactInputParams calldata params,
        address router,
        address approveTarget,
        bytes calldata swapData,
        PermitParams calldata permit,
        address poster
    ) external payable nonReentrant returns (uint256 amountOut) {
        // Verify the permit parameters
        if (permit.value < params.amountIn) {
            SwapRouter__InvalidAmount.selector.revertWith();
        }

        if (params.tokenIn != CurrencyTransfer.NATIVE_TOKEN) {
            // Try ERC20Permit (EIP-2612)
            if (_tryERC20Permit(params.tokenIn, permit)) {
                // Pull tokens after the permit
                IERC20(params.tokenIn).transferFrom(permit.owner, address(this), params.amountIn);
            }
            // If permit fails, revert
            else {
                SwapRouter__PermitFailed.selector.revertWith();
            }
        } else {
            // For native token, ensure the value is sent
            if (msg.value != params.amountIn) {
                SwapRouter__InvalidAmount.selector.revertWith();
            }
        }

        // Execute the swap with the permit owner as the payer
        return _executeSwap(params, router, approveTarget, swapData, permit.owner, poster);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          INTERNAL                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Internal function to execute a swap with a specified payer
    /// @param params The parameters for the swap
    /// @param router The address of the router to use
    /// @param approveTarget The address to approve the token transfer
    /// @param swapData The calldata to execute on the router
    /// @param payer The address providing the input tokens
    /// @param poster The address that posted this swap opportunity
    /// @return amountOut The amount of tokenOut received
    function _executeSwap(
        ExactInputParams memory params,
        address router,
        address approveTarget,
        bytes memory swapData,
        address payer,
        address poster
    ) internal returns (uint256 amountOut) {
        // only allow whitelisted routers
        if (!_isRouterWhitelisted(router)) {
            SwapRouter__InvalidRouter.selector.revertWith();
        }
        if (!_isRouterWhitelisted(approveTarget)) {
            SwapRouter__InvalidRouter.selector.revertWith();
        }

        // use message sender as recipient if not specified
        address tokenRecipient = params.recipient == address(0) ? msg.sender : params.recipient;

        // snapshot the balance before swap
        uint256 balanceBefore = _getBalance(params.tokenOut);
        uint256 amountIn = params.amountIn;
        {
            uint256 value;
            if (params.tokenIn == CurrencyTransfer.NATIVE_TOKEN) {
                // for native token, the value should be sent with the transaction
                value = amountIn;
            } else {
                // In executeSwapWithPermit, tokens are already transferred to this contract
                // In executeSwap, we need to transfer them now
                if (msg.sender == payer) {
                    // use the actual received amount to handle fee-on-transfer tokens
                    uint256 tokenInBalanceBefore = _getBalance(params.tokenIn);
                    IERC20(params.tokenIn).transferFrom(payer, address(this), amountIn);
                    amountIn = _getBalance(params.tokenIn) - tokenInBalanceBefore;
                }

                IERC20(params.tokenIn).approve(approveTarget, amountIn);
            }

            // execute swap with the router
            (bool success, ) = router.call{value: value}(swapData);
            if (!success) SwapRouter__SwapFailed.selector.revertWith();
        }

        // use the actual received amount to handle fee-on-transfer tokens
        amountOut = _getBalance(params.tokenOut) - balanceBefore;
        // slippage check
        if (amountOut < params.minAmountOut) {
            SwapRouter__InsufficientOutput.selector.revertWith();
        }

        // calculate and distribute fees
        uint256 finalAmount;
        {
            (uint256 posterFee, uint256 treasuryFee) = _collectFees(
                params.tokenOut,
                amountOut,
                poster
            );
            finalAmount = amountOut - posterFee - treasuryFee;
        }

        // transfer remaining tokens to the recipient
        CurrencyTransfer.transferCurrency(
            params.tokenOut,
            address(this),
            tokenRecipient,
            finalAmount
        );

        // reset approval for tokenIn
        if (params.tokenIn != CurrencyTransfer.NATIVE_TOKEN) {
            IERC20(params.tokenIn).approve(approveTarget, 0);
        }

        emit Swap(
            router,
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            amountOut,
            tokenRecipient
        );
    }

    /// @notice Try to use ERC20Permit (EIP-2612) for token approval
    /// @param token The token address to permit
    /// @param permit The permit data
    /// @return success Whether the permit was successful
    function _tryERC20Permit(address token, PermitParams memory permit) internal returns (bool) {
        try
            IERC20Permit(token).permit(
                permit.owner,
                permit.spender == address(0) ? address(this) : permit.spender,
                permit.value,
                permit.deadline,
                permit.v,
                permit.r,
                permit.s
            )
        {
            return true;
        } catch {
            return false;
        }
    }

    /// @notice Collects and distributes both poster and treasury fees
    /// @param token The token to collect fees in
    /// @param amount The amount to calculate fees from
    /// @param poster The address that posted this swap opportunity
    /// @return posterFee Amount collected as poster fee
    /// @return treasuryFee Amount collected as treasury fee
    function _collectFees(
        address token,
        uint256 amount,
        address poster
    ) internal returns (uint256 posterFee, uint256 treasuryFee) {
        IPlatformRequirements platform = _getPlatformRequirements();
        (uint16 treasuryBps, uint16 posterBps) = platform.getSwapFees();

        posterFee = BasisPoints.calculate(amount, posterBps);
        treasuryFee = BasisPoints.calculate(amount, treasuryBps);

        CurrencyTransfer.transferCurrency(token, address(this), poster, posterFee);

        CurrencyTransfer.transferCurrency(
            token,
            address(this),
            platform.getFeeRecipient(),
            treasuryFee
        );
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
        return IERC20(token).balanceOf(address(this));
    }
}
