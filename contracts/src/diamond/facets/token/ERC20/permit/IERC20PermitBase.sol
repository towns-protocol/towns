// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/draft-IERC20Permit.sol";

// libraries

// contracts

interface IERC20PermitBase is IERC20Permit {
  /// @dev The permit is invalid.
  error InvalidPermit();

  /// @dev The permit has expired.
  error PermitExpired();
}
