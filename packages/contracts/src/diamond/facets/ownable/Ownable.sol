// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IERC173} from "./IERC173.sol";

// libraries

// contracts
import {OwnableController} from "./OwnableController.sol";

contract Ownable is IERC173, OwnableController {
  /// @inheritdoc IERC173
  function owner() external view override returns (address) {
    return _owner();
  }

  /// @inheritdoc IERC173
  function transferOwnership(address newOwner) external override onlyOwner {
    _transferOwnership(newOwner);
  }
}
