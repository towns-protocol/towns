// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IERC173Events} from "../IERC173.sol";
import {IERC173} from "../IERC173.sol";

// libraries
import {TokenOwnableService} from "./TokenOwnableService.sol";

// contracts

abstract contract TokenOwnableController is IERC173Events {
  function __Ownable_init(address collection, uint256 tokenId) internal {
    TokenOwnableService.initialize(collection, tokenId);
  }

  modifier onlyOwner() {
    TokenOwnableService.checkOwner();
    _;
  }

  function _owner() internal view returns (address owner) {
    owner = TokenOwnableService.owner();
  }

  function _transferOwnership(address newOwner) internal {
    address oldOwner = _owner();
    TokenOwnableService.transferOwnership(newOwner);
    emit OwnershipTransferred(oldOwner, newOwner);
  }
}
