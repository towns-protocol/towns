// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISwapRouter, ISwapRouterBase} from "./ISwapRouter.sol";
import {IPlatformRequirements} from "contracts/src/factory/facets/platform/requirements/IPlatformRequirements.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// libraries
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {CurrencyTransfer} from "contracts/src/utils/libraries/CurrencyTransfer.sol";
import {BasisPoints} from "contracts/src/utils/libraries/BasisPoints.sol";
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";

// contracts
import {MembershipBase} from "../membership/MembershipBase.sol";

/// @title SwapRouter
/// @notice Handles swaps through whitelisted routers with fee collection
contract SwapRouter is ISwapRouter, MembershipBase, Facet {
  using CustomRevert for bytes4;

  /// @notice Executes a swap through a whitelisted router
  /// @param router The address of the router to use
  /// @param approveTarget The address to approve the token transfer
  /// @param tokenIn The token being sold
  /// @param tokenOut The token being bought
  /// @param amountIn The amount of tokenIn to swap
  /// @param minAmountOut The minimum amount of tokenOut to receive
  /// @param poster The address that posted this swap opportunity
  /// @param swapData The calldata to execute on the router
  /// @return amountOut The amount of tokenOut received
  function executeSwap(
    address router,
    address approveTarget,
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    uint256 minAmountOut,
    address poster,
    bytes calldata swapData // TODO: add reentrancy guard
  ) external payable returns (uint256 amountOut) {
    // Validate inputs
    if (amountIn == 0) SwapRouter__InvalidAmount.selector.revertWith();
    if (!_isRouterWhitelisted(router)) {
      SwapRouter__InvalidRouter.selector.revertWith();
    }

    // Transfer tokens from user to this contract
    uint256 balanceBefore = _getBalance(tokenOut);

    uint256 value;
    if (tokenIn == CurrencyTransfer.NATIVE_TOKEN) {
      if (msg.value != amountIn) {
        SwapRouter__InvalidAmount.selector.revertWith();
      }
      value = amountIn;
    } else {
      IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
      IERC20(tokenIn).approve(approveTarget, amountIn);
    }

    // Execute swap
    (bool success, ) = router.call{value: value}(swapData);
    if (!success) SwapRouter__SwapFailed.selector.revertWith();

    // Calculate amount received
    amountOut = _getBalance(tokenOut) - balanceBefore;
    if (amountOut < minAmountOut) {
      SwapRouter__InsufficientOutput.selector.revertWith();
    }

    // Calculate and distribute fees
    uint256 finalAmount;
    {
      (uint256 posterFee, uint256 treasuryFee) = _collectFees(
        tokenOut,
        amountOut,
        poster
      );
      finalAmount = amountOut - posterFee - treasuryFee;
    }

    // Transfer remaining tokens to user
    CurrencyTransfer.transferCurrency(
      tokenOut,
      address(this),
      msg.sender,
      finalAmount
    );

    // Reset approval for tokenIn
    if (tokenIn != CurrencyTransfer.NATIVE_TOKEN) {
      IERC20(tokenIn).approve(approveTarget, 0);
    }

    emit Swap(router, tokenIn, tokenOut, amountIn, amountOut, msg.sender);
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
}
