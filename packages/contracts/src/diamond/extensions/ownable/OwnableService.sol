// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries
import {OwnableStorage} from "./OwnableStorage.sol";

// contracts

error Ownable__ZeroAddress();
error Ownable__NotOwner(address account);

library OwnableService {
  function owner() internal view returns (address) {
    return OwnableStorage.layout().owner;
  }

  function checkOwner() internal view {
    if (msg.sender != owner()) {
      revert Ownable__NotOwner(msg.sender);
    }
  }

  function transferOwnership(address newOwner) internal {
    if (newOwner == address(0)) revert Ownable__ZeroAddress();
    OwnableStorage.layout().owner = newOwner;
  }

  function renounceOwnership() internal {
    OwnableStorage.layout().owner = address(0);
  }
}
