// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IOwnableBase} from "./IERC173.sol";

// libraries
import {OwnableStorage} from "./OwnableStorage.sol";

// contracts

abstract contract OwnableBase is IOwnableBase {
  modifier onlyOwner() {
    if (msg.sender != _owner()) {
      revert Ownable__NotOwner(msg.sender);
    }
    _;
  }

  function _owner() internal view returns (address owner) {
    return OwnableStorage.layout().owner;
  }

  function _transferOwnership(address newOwner) internal {
    address oldOwner = _owner();
    if (newOwner == address(0)) revert Ownable__ZeroAddress();
    OwnableStorage.layout().owner = newOwner;
    emit OwnershipTransferred(oldOwner, newOwner);
  }

  function _renounceOwnership() internal virtual {
    address oldOwner = _owner();
    OwnableStorage.layout().owner = address(0);
    emit OwnershipTransferred(oldOwner, address(0));
  }
}
