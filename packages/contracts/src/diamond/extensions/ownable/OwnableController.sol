// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IERC173Events} from "./IERC173.sol";
import {IERC173} from "./IERC173.sol";

// libraries
import {OwnableService} from "./OwnableService.sol";

// contracts

abstract contract OwnableController is IERC173Events {
  function __Ownable_init() internal {
    OwnableService.transferOwnership(msg.sender);
  }

  modifier onlyOwner() {
    OwnableService.checkOwner();
    _;
  }

  function _owner() internal view returns (address owner) {
    owner = OwnableService.owner();
  }

  function _transferOwnership(address newOwner) internal {
    address oldOwner = _owner();
    OwnableService.transferOwnership(newOwner);
    emit OwnershipTransferred(oldOwner, newOwner);
  }

  function _renounceOwnership() internal {
    address oldOwner = _owner();
    OwnableService.renounceOwnership();
    emit OwnershipTransferred(oldOwner, address(0));
  }
}
