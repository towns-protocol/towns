// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IERC173} from "./IERC173.sol";

// libraries

// contracts
import {OwnableUpgradeable} from "./OwnableUpgradeable.sol";

contract Ownable is IERC173, OwnableUpgradeable {
  /// @inheritdoc IERC173
  function owner() external view override returns (address) {
    return _owner();
  }

  /// @inheritdoc IERC173
  function transferOwnership(address newOwner) external override onlyOwner {
    _transferOwnership(newOwner);
  }
}
