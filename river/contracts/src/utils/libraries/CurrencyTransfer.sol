// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces
import {IWETH} from "contracts/src/utils/interfaces/IWETH.sol";

// libraries
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";

// contracts

library CurrencyTransfer {
  using SafeTransferLib for address;

  /// @dev The address interpreted as native token of the chain.
  address internal constant NATIVE_TOKEN =
    address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

  /// @dev The ETH transfer has failed.
  error ETHTransferFailed();

  /// @dev The ERC20 `transferFrom` has failed.
  error TransferFromFailed();

  /// @dev The ERC20 `transfer` has failed.
  error TransferFailed();

  /// @dev The `msg.value` does not match the amount.
  error MsgValueMismatch();

  /// @dev Transfers a given amount of currency.
  /// @param currency The currency to transfer.
  /// @param from The address to transfer from.
  /// @param to The address to transfer to.
  /// @param amount The amount to transfer.
  function transferCurrency(
    address currency,
    address from,
    address to,
    uint256 amount
  ) internal {
    if (amount == 0) {
      return;
    }

    if (currency == NATIVE_TOKEN) {
      safeTransferNativeToken(to, amount);
    } else {
      safeTransferERC20(currency, from, to, amount);
    }
  }

  /// @dev Transfers a given amount of currency. (With native token wrapping)
  /// @param currency The currency to transfer.
  /// @param from The address to transfer from.
  /// @param to The address to transfer to.
  /// @param amount The amount to transfer.
  /// @param _nativeTokenWrapper The address of the native token wrapper.
  function transferCurrencyWithWrapper(
    address currency,
    address from,
    address to,
    uint256 amount,
    address _nativeTokenWrapper
  ) internal {
    if (amount == 0) {
      return;
    }

    if (currency == NATIVE_TOKEN) {
      if (from == address(this)) {
        IWETH(_nativeTokenWrapper).withdraw(amount);
        safeTransferNativeTokenWithWrapper(to, amount, _nativeTokenWrapper);
      } else if (to == address(this)) {
        if (amount != msg.value)
          CustomRevert.revertWith(MsgValueMismatch.selector);

        IWETH(_nativeTokenWrapper).deposit{value: msg.value}();
      } else {
        // This is a fallback for the case where the contract receives native token and then transfers it to another address.
        if (amount != msg.value)
          CustomRevert.revertWith(MsgValueMismatch.selector);

        safeTransferNativeTokenWithWrapper(to, msg.value, _nativeTokenWrapper);
      }
    } else {
      safeTransferERC20(currency, from, to, amount);
    }
  }

  /// @dev Transfer `amount` of ERC20 token from `from` to `to`.
  function safeTransferERC20(
    address token,
    address from,
    address to,
    uint256 amount
  ) internal {
    if (from == to) {
      return;
    }

    if (from == address(this)) {
      token.safeTransfer(to, amount);
    } else {
      token.safeTransferFrom(from, to, amount);
    }
  }

  /// @dev Transfers `amount` of native token to `to`.
  function safeTransferNativeToken(address to, uint256 value) internal {
    to.safeTransferETH(value);
  }

  /// @dev Transfers `amount` of native token to `to`. (With native token wrapping)
  function safeTransferNativeTokenWithWrapper(
    address to,
    uint256 value,
    address _nativeTokenWrapper
  ) internal {
    bool success = to.trySafeTransferETH(value, gasleft());
    if (!success) {
      IWETH(_nativeTokenWrapper).deposit{value: value}();
      _nativeTokenWrapper.safeTransfer(to, value);
    }
  }
}
