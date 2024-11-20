// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

import {AllowanceMap} from "./AllowanceMap.sol";
import {BalanceMap} from "./BalanceMap.sol";

using ERC20Lib for MinimalERC20Storage global;

/// @notice Minimal storage layout for an ERC20 token
/// @dev Do not modify the layout of this struct especially if it's nested in another struct
/// or used in a linear storage layout
struct MinimalERC20Storage {
  BalanceMap balances;
  AllowanceMap allowances;
  uint256 totalSupply;
}

/// @notice Rewrite of OpenZeppelin's ERC20Upgradeable adapted to use a flexible storage slot
library ERC20Lib {
  function balanceOf(
    MinimalERC20Storage storage self,
    address account
  ) internal view returns (uint256) {
    return self.balances.get(account);
  }

  function allowance(
    MinimalERC20Storage storage self,
    address owner,
    address spender
  ) internal view returns (uint256) {
    return self.allowances.get(owner, spender);
  }

  /// @dev Sets a `value` amount of tokens as the allowance of `spender` over the caller's tokens.
  function approve(
    MinimalERC20Storage storage self,
    address spender,
    uint256 value
  ) internal {
    self.approve(msg.sender, spender, value);
  }

  /// @dev Moves a `value` amount of tokens from the caller's account to `to`.
  function transfer(
    MinimalERC20Storage storage self,
    address to,
    uint256 value
  ) internal {
    self.transfer(msg.sender, to, value);
  }

  /// @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism.
  /// `value` is then deducted from the caller's allowance.
  function transferFrom(
    MinimalERC20Storage storage self,
    address from,
    address to,
    uint256 value
  ) internal {
    self.spendAllowance(from, msg.sender, value);
    self.transfer(from, to, value);
  }

  /// @dev Creates a `value` amount of tokens and assigns them to `account`, by transferring it from address(0).
  function mint(
    MinimalERC20Storage storage self,
    address account,
    uint256 value
  ) internal {
    if (account == address(0)) {
      revert IERC20Errors.ERC20InvalidReceiver(address(0));
    }
    // Overflow check required: The rest of the code assumes that totalSupply never overflows
    self.totalSupply += value;
    _increaseBalance(self, account, value);
    emit IERC20.Transfer(address(0), account, value);
  }

  /// @dev Destroys a `value` amount of tokens from `account`, lowering the total supply.
  function burn(
    MinimalERC20Storage storage self,
    address account,
    uint256 value
  ) internal {
    if (account == address(0)) {
      revert IERC20Errors.ERC20InvalidSender(address(0));
    }
    _deductBalance(self, account, value);
    unchecked {
      // Overflow not possible: value <= totalSupply or value <= fromBalance <= totalSupply.
      self.totalSupply -= value;
    }
    emit IERC20.Transfer(account, address(0), value);
  }

  /// @dev Sets `value` as the allowance of `spender` over the `owner` s tokens.
  function approve(
    MinimalERC20Storage storage self,
    address owner,
    address spender,
    uint256 value
  ) internal {
    self.allowances.set(owner, spender, value);
    emit IERC20.Approval(owner, spender, value);
  }

  /// @dev Updates `owner` s allowance for `spender` based on spent `value`.
  function spendAllowance(
    MinimalERC20Storage storage self,
    address owner,
    address spender,
    uint256 value
  ) internal {
    uint256 slot = self.allowances.slot(owner, spender);
    uint256 currentAllowance;
    assembly {
      currentAllowance := sload(slot)
    }
    if (currentAllowance != type(uint256).max) {
      if (currentAllowance < value) {
        revert IERC20Errors.ERC20InsufficientAllowance(
          spender,
          currentAllowance,
          value
        );
      }
      assembly {
        sstore(slot, sub(currentAllowance, value))
      }
    }
  }

  /// @dev Moves a `value` amount of tokens from `from` to `to`.
  function transfer(
    MinimalERC20Storage storage self,
    address from,
    address to,
    uint256 value
  ) internal {
    _update(self, from, to, value);
    emit IERC20.Transfer(from, to, value);
  }

  /// @dev Transfers a `value` amount of tokens from `from` to `to`.
  /// @dev `from` and `to` are not checked for null address.
  function _update(
    MinimalERC20Storage storage self,
    address from,
    address to,
    uint256 value
  ) private {
    _deductBalance(self, from, value);
    _increaseBalance(self, to, value);
  }

  function _deductBalance(
    MinimalERC20Storage storage self,
    address from,
    uint256 value
  ) private {
    uint256 fromSlot = self.balances.slot(from);
    uint256 fromBalance;
    assembly {
      fromBalance := sload(fromSlot)
    }
    if (fromBalance < value) {
      revert IERC20Errors.ERC20InsufficientBalance(from, fromBalance, value);
    }
    assembly {
      // Overflow not possible: value <= fromBalance <= totalSupply.
      sstore(fromSlot, sub(fromBalance, value))
    }
  }

  function _increaseBalance(
    MinimalERC20Storage storage self,
    address to,
    uint256 value
  ) private {
    uint256 toSlot = self.balances.slot(to);
    assembly {
      // Overflow not possible: balance + value is at most totalSupply, which we know fits
      // into a uint256.
      let toBalanceBefore := sload(toSlot)
      sstore(toSlot, add(toBalanceBefore, value))
    }
  }
}
