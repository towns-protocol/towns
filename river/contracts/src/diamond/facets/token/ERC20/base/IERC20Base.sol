// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// libraries

// contracts

interface IERC20Base is IERC20 {
  // =============================================================
  //                           ERRORS
  // =============================================================
  /// @dev The total supply has overflowed.
  error TotalSupplyOverflow();

  /// @dev The allowance has overflowed.
  error AllowanceOverflow();

  /// @dev The allowance has underflowed.
  error AllowanceUnderflow();

  /// @dev Insufficient balance.
  error InsufficientBalance();

  /// @dev Insufficient allowance.
  error InsufficientAllowance();
}
