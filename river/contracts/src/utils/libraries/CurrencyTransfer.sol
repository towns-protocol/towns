// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces
import {IWETH} from "contracts/src/utils/interfaces/IWETH.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// libraries

// contracts

library CurrencyTransfer {
  using SafeERC20 for IERC20;

  /// @dev The address interpreted as native token of the chain.
  address public constant NATIVE_TOKEN =
    address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

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
        require(amount == msg.value, "msg.value != amount");
        IWETH(_nativeTokenWrapper).deposit{value: amount}();
      } else {
        safeTransferNativeTokenWithWrapper(to, amount, _nativeTokenWrapper);
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
      IERC20(token).safeTransfer(to, amount);
    } else {
      IERC20(token).safeTransferFrom(from, to, amount);
    }
  }

  /// @dev Transfers `amount` of native token to `to`.
  function safeTransferNativeToken(address to, uint256 value) internal {
    (bool success, ) = to.call{value: value}("");
    require(success, "native token transfer failed");
  }

  /// @dev Transfers `amount` of native token to `to`. (With native token wrapping)
  function safeTransferNativeTokenWithWrapper(
    address to,
    uint256 value,
    address _nativeTokenWrapper
  ) internal {
    (bool success, ) = to.call{value: value}("");
    if (!success) {
      IWETH(_nativeTokenWrapper).deposit{value: value}();
      IERC20(_nativeTokenWrapper).safeTransfer(to, value);
    }
  }
}
