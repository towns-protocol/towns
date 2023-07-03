// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IERC173} from "../IERC173.sol";

// libraries

// contracts
import {TokenOwnableController} from "./TokenOwnableController.sol";

contract TokenOwnable is IERC173, TokenOwnableController {
  /// @inheritdoc IERC173
  function owner() external view returns (address) {
    return _owner();
  }

  /// @inheritdoc IERC173
  function transferOwnership(address newOwner) external onlyOwner {
    _transferOwnership(newOwner);
  }
}
