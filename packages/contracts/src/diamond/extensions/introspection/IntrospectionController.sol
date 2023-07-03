// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IIntrospectionEvents} from "./IERC165.sol";

// libraries
import {IntrospectionService} from "./IntrospectionService.sol";

abstract contract IntrospectionController is IIntrospectionEvents {
  function _addInterface(bytes4 interfaceId) internal {
    IntrospectionService.addInterface(interfaceId);
    emit InterfaceAdded(interfaceId);
  }

  function _removeInterface(bytes4 interfaceId) internal {
    IntrospectionService.removeInterface(interfaceId);
    emit InterfaceRemoved(interfaceId);
  }

  function _supportsInterface(bytes4 interfaceId) internal view returns (bool) {
    return IntrospectionService.supportsInterface(interfaceId);
  }
}
