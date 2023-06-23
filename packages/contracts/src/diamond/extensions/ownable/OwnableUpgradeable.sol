// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IERC173Events, IERC173} from "./IERC173.sol";

// libraries
import {OwnableService} from "./OwnableService.sol";
import {IntrospectionService} from "contracts/src/diamond/extensions/introspection/IntrospectionService.sol";

// contracts

abstract contract OwnableUpgradeable is IERC173Events {
  modifier onlyOwner() {
    OwnableService.checkOwner();
    _;
  }

  function __Ownable_init() internal {
    IntrospectionService.addInterface(type(IERC173).interfaceId);
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
