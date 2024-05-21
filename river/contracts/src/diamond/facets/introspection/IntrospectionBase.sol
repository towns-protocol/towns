// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IIntrospectionBase} from "./IERC165.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

// libraries
import {IntrospectionStorage} from "./IntrospectionStorage.sol";

abstract contract IntrospectionBase is IIntrospectionBase {
  function __IntrospectionBase_init() internal {
    _addInterface(type(IERC165).interfaceId);
  }

  function _addInterface(bytes4 interfaceId) internal {
    if (!_supportsInterface(interfaceId)) {
      IntrospectionStorage.layout().supportedInterfaces[interfaceId] = true;
    } else {
      revert Introspection_AlreadySupported();
    }
    emit InterfaceAdded(interfaceId);
  }

  function _removeInterface(bytes4 interfaceId) internal {
    if (_supportsInterface(interfaceId)) {
      IntrospectionStorage.layout().supportedInterfaces[interfaceId] = false;
    } else {
      revert Introspection_NotSupported();
    }
    emit InterfaceRemoved(interfaceId);
  }

  function _supportsInterface(bytes4 interfaceId) internal view returns (bool) {
    return
      IntrospectionStorage.layout().supportedInterfaces[interfaceId] == true;
  }
}
