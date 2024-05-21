// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC20Base} from "./IERC20Base.sol";

// libraries

// contracts

abstract contract ERC20Base is IERC20Base {
  // =============================================================
  //                       EVENT SIGNATURES
  // =============================================================

  /// @dev `keccak256(bytes("Transfer(address,address,uint256)"))`.
  uint256 private constant _TRANSFER_EVENT_SIGNATURE =
    0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef;

  /// @dev `keccak256(bytes("Approval(address,address,uint256)"))`.
  uint256 private constant _APPROVAL_EVENT_SIGNATURE =
    0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925;

  // =============================================================
  //                           STORAGE
  // =============================================================

  /// @dev The storage slot for the total supply.
  uint256 private constant _TOTAL_SUPPLY_SLOT = 0x05345cdf77eb68f44c;

  /// @dev The balance slot of `owner` is given by:
  /// ```
  ///     mstore(0x0c, _BALANCE_SLOT_SEED)
  ///     mstore(0x00, owner)
  ///     let balanceSlot := keccak256(0x0c, 0x20)
  /// ```
  uint256 private constant _BALANCE_SLOT_SEED = 0x87a211a2;

  /// @dev The allowance slot of (`owner`, `spender`) is given by:
  /// ```
  ///     mstore(0x20, spender)
  ///     mstore(0x0c, _ALLOWANCE_SLOT_SEED)
  ///     mstore(0x00, owner)
  ///     let allowanceSlot := keccak256(0x0c, 0x34)
  /// ```
  uint256 private constant _ALLOWANCE_SLOT_SEED = 0x7f5e9f20;

  /// @dev Returns the amount of tokens in existence.
  function _totalSupply() internal view returns (uint256 result) {
    assembly {
      result := sload(_TOTAL_SUPPLY_SLOT)
    }
  }

  /// @dev Returns the amount of tokens owned by `owner`.
  function _balanceOf(address owner) internal view returns (uint256 result) {
    assembly {
      mstore(0x0c, _BALANCE_SLOT_SEED)
      mstore(0x00, owner)
      result := sload(keccak256(0x0c, 0x20))
    }
  }

  /// @dev Returns the amount of tokens that `spender` can spend on behalf of `owner`.
  function _allowance(
    address owner,
    address spender
  ) internal view returns (uint256 result) {
    assembly {
      mstore(0x20, spender)
      mstore(0x0c, _ALLOWANCE_SLOT_SEED)
      mstore(0x00, owner)
      result := sload(keccak256(0x0c, 0x34))
    }
  }

  /// @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
  ///
  /// Emits a {Approval} event.
  function _approve(address spender, uint256 amount) internal returns (bool) {
    assembly {
      // Compute the allowance slot and store the amount.
      mstore(0x20, spender)
      mstore(0x0c, _ALLOWANCE_SLOT_SEED)
      mstore(0x00, caller())
      sstore(keccak256(0x0c, 0x34), amount)
      // Emit the {Approval} event.
      mstore(0x00, amount)
      log3(
        0x00,
        0x20,
        _APPROVAL_EVENT_SIGNATURE,
        caller(),
        shr(96, mload(0x2c))
      )
    }
    return true;
  }

  /// @dev Sets `amount` as the allowance of `spender` over the tokens of `owner`.
  ///
  /// Emits a {Approval} event.
  function _approve(
    address owner,
    address spender,
    uint256 amount
  ) internal virtual {
    assembly {
      let owner_ := shl(96, owner)
      // Compute the allowance slot and store the amount.
      mstore(0x20, spender)
      mstore(0x0c, or(owner_, _ALLOWANCE_SLOT_SEED))
      sstore(keccak256(0x0c, 0x34), amount)
      // Emit the {Approval} event.
      mstore(0x00, amount)
      log3(
        0x00,
        0x20,
        _APPROVAL_EVENT_SIGNATURE,
        shr(96, owner_),
        shr(96, mload(0x2c))
      )
    }
  }

  /// @dev Updates the allowance of `owner` for `spender` based on spent `amount`.
  function _spendAllowance(
    address owner,
    address spender,
    uint256 amount
  ) internal virtual {
    /// @solidity memory-safe-assembly
    assembly {
      // Compute the allowance slot and load its value.
      mstore(0x20, spender)
      mstore(0x0c, _ALLOWANCE_SLOT_SEED)
      mstore(0x00, owner)
      let allowanceSlot := keccak256(0x0c, 0x34)
      let allowance_ := sload(allowanceSlot)
      // If the allowance is not the maximum uint256 value.
      if add(allowance_, 1) {
        // Revert if the amount to be transferred exceeds the allowance.
        if gt(amount, allowance_) {
          mstore(0x00, 0x13be252b) // `InsufficientAllowance()`.
          revert(0x1c, 0x04)
        }
        // Subtract and store the updated allowance.
        sstore(allowanceSlot, sub(allowance_, amount))
      }
    }
  }

  /// @dev Mints `amount` tokens to `to`, increasing the total supply.
  ///
  /// Emits a {Transfer} event.
  function _mint(address to, uint256 amount) internal virtual {
    _beforeTokenTransfer(address(0), to, amount);

    assembly {
      let totalSupplyBefore := sload(_TOTAL_SUPPLY_SLOT)
      let totalSupplyAfter := add(totalSupplyBefore, amount)
      // Revert if the total supply overflows.
      if lt(totalSupplyAfter, totalSupplyBefore) {
        mstore(0x00, 0xe5cfe957) // `TotalSupplyOverflow()`.
        revert(0x1c, 0x04)
      }
      // Store the updated total supply.
      sstore(_TOTAL_SUPPLY_SLOT, totalSupplyAfter)
      // Compute the balance slot and load its value.
      mstore(0x0c, _BALANCE_SLOT_SEED)
      mstore(0x00, to)
      let toBalanceSlot := keccak256(0x0c, 0x20)
      // Add and store the updated balance.
      sstore(toBalanceSlot, add(sload(toBalanceSlot), amount))
      // Emit the {Transfer} event.
      mstore(0x20, amount)
      log3(0x20, 0x20, _TRANSFER_EVENT_SIGNATURE, 0, shr(96, mload(0x0c)))
    }

    _afterTokenTransfer(address(0), to, amount);
  }

  /// @dev Burns `amount` tokens from `from`, reducing the total supply.
  ///
  /// Emits a {Transfer} event.
  function _burn(address from, uint256 amount) internal virtual {
    _beforeTokenTransfer(from, address(0), amount);
    /// @solidity memory-safe-assembly
    assembly {
      // Compute the balance slot and load its value.
      mstore(0x0c, _BALANCE_SLOT_SEED)
      mstore(0x00, from)
      let fromBalanceSlot := keccak256(0x0c, 0x20)
      let fromBalance := sload(fromBalanceSlot)
      // Revert if insufficient balance.
      if gt(amount, fromBalance) {
        mstore(0x00, 0xf4d678b8) // `InsufficientBalance()`.
        revert(0x1c, 0x04)
      }
      // Subtract and store the updated balance.
      sstore(fromBalanceSlot, sub(fromBalance, amount))
      // Subtract and store the updated total supply.
      sstore(_TOTAL_SUPPLY_SLOT, sub(sload(_TOTAL_SUPPLY_SLOT), amount))
      // Emit the {Transfer} event.
      mstore(0x00, amount)
      log3(0x00, 0x20, _TRANSFER_EVENT_SIGNATURE, shr(96, shl(96, from)), 0)
    }
    _afterTokenTransfer(from, address(0), amount);
  }

  /// @dev Transfer `amount` tokens from the caller to `to`.
  ///
  /// Requirements:
  /// - `from` must at least have `amount`.
  ///
  /// Emits a {Transfer} event.
  function _transfer(address to, uint256 amount) internal returns (bool) {
    _beforeTokenTransfer(msg.sender, to, amount);

    /// @solidity memory-safe-assembly
    assembly {
      // Compute the balance slot and load its value.
      mstore(0x0c, _BALANCE_SLOT_SEED)
      mstore(0x00, caller())
      let fromBalanceSlot := keccak256(0x0c, 0x20)
      let fromBalance := sload(fromBalanceSlot)
      // Revert if insufficient balance.
      if gt(amount, fromBalance) {
        mstore(0x00, 0xf4d678b8) // `InsufficientBalance()`.
        revert(0x1c, 0x04)
      }
      // Subtract and store the updated balance.
      sstore(fromBalanceSlot, sub(fromBalance, amount))
      // Compute the balance slot of `to`.
      mstore(0x00, to)
      let toBalanceSlot := keccak256(0x0c, 0x20)
      // Add and store the updated balance of `to`.
      // Will not overflow because the sum of all user balances
      // cannot exceed the maximum uint256 value.
      sstore(toBalanceSlot, add(sload(toBalanceSlot), amount))
      // Emit the {Transfer} event.
      mstore(0x20, amount)
      log3(
        0x20,
        0x20,
        _TRANSFER_EVENT_SIGNATURE,
        caller(),
        shr(96, mload(0x0c))
      )
    }
    _afterTokenTransfer(msg.sender, to, amount);
    return true;
  }

  /// @dev Moves `amount` of tokens from `from` to `to`.
  function _transfer(
    address from,
    address to,
    uint256 amount
  ) internal virtual {
    _beforeTokenTransfer(from, to, amount);
    /// @solidity memory-safe-assembly
    assembly {
      let from_ := shl(96, from)
      // Compute the balance slot and load its value.
      mstore(0x0c, or(from_, _BALANCE_SLOT_SEED))
      let fromBalanceSlot := keccak256(0x0c, 0x20)
      let fromBalance := sload(fromBalanceSlot)
      // Revert if insufficient balance.
      if gt(amount, fromBalance) {
        mstore(0x00, 0xf4d678b8) // `InsufficientBalance()`.
        revert(0x1c, 0x04)
      }
      // Subtract and store the updated balance.
      sstore(fromBalanceSlot, sub(fromBalance, amount))
      // Compute the balance slot of `to`.
      mstore(0x00, to)
      let toBalanceSlot := keccak256(0x0c, 0x20)
      // Add and store the updated balance of `to`.
      // Will not overflow because the sum of all user balances
      // cannot exceed the maximum uint256 value.
      sstore(toBalanceSlot, add(sload(toBalanceSlot), amount))
      // Emit the {Transfer} event.
      mstore(0x20, amount)
      log3(
        0x20,
        0x20,
        _TRANSFER_EVENT_SIGNATURE,
        shr(96, from_),
        shr(96, mload(0x0c))
      )
    }
    _afterTokenTransfer(from, to, amount);
  }

  /// @dev Transfers `amount` tokens from `from` to `to`.
  ///
  /// Note: Does not update the allowance if it is the maximum uint256 value.
  ///
  /// Requirements:
  /// - `from` must at least have `amount`.
  /// - The caller must have at least `amount` of allowance to transfer the tokens of `from`.
  ///
  /// Emits a {Transfer} event.
  function _transferFrom(
    address from,
    address to,
    uint256 amount
  ) internal returns (bool) {
    _beforeTokenTransfer(from, to, amount);
    /// @solidity memory-safe-assembly
    assembly {
      let from_ := shl(96, from)
      // Compute the allowance slot and load its value.
      mstore(0x20, caller())
      mstore(0x0c, or(from_, _ALLOWANCE_SLOT_SEED))
      let allowanceSlot := keccak256(0x0c, 0x34)
      let allowance_ := sload(allowanceSlot)
      // If the allowance is not the maximum uint256 value.
      if add(allowance_, 1) {
        // Revert if the amount to be transferred exceeds the allowance.
        if gt(amount, allowance_) {
          mstore(0x00, 0x13be252b) // `InsufficientAllowance()`.
          revert(0x1c, 0x04)
        }
        // Subtract and store the updated allowance.
        sstore(allowanceSlot, sub(allowance_, amount))
      }
      // Compute the balance slot and load its value.
      mstore(0x0c, or(from_, _BALANCE_SLOT_SEED))
      let fromBalanceSlot := keccak256(0x0c, 0x20)
      let fromBalance := sload(fromBalanceSlot)
      // Revert if insufficient balance.
      if gt(amount, fromBalance) {
        mstore(0x00, 0xf4d678b8) // `InsufficientBalance()`.
        revert(0x1c, 0x04)
      }
      // Subtract and store the updated balance.
      sstore(fromBalanceSlot, sub(fromBalance, amount))
      // Compute the balance slot of `to`.
      mstore(0x00, to)
      let toBalanceSlot := keccak256(0x0c, 0x20)
      // Add and store the updated balance of `to`.
      // Will not overflow because the sum of all user balances
      // cannot exceed the maximum uint256 value.
      sstore(toBalanceSlot, add(sload(toBalanceSlot), amount))
      // Emit the {Transfer} event.
      mstore(0x20, amount)
      log3(
        0x20,
        0x20,
        _TRANSFER_EVENT_SIGNATURE,
        shr(96, from_),
        shr(96, mload(0x0c))
      )
    }
    _afterTokenTransfer(from, to, amount);
    return true;
  }

  // =============================================================
  //                           HOOKS
  // =============================================================
  /// @dev Hook that is called before any transfer of tokens.
  /// This includes minting and burning.
  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 amount
  ) internal virtual {}

  /// @dev Hook that is called after any transfer of tokens.
  /// This includes minting and burning.
  function _afterTokenTransfer(
    address from,
    address to,
    uint256 amount
  ) internal virtual {}
}
