// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries
import {IntrospectionStorage} from "./IntrospectionStorage.sol";

// contracts
error Introspection_AlreadySupported();
error Introspection_NotSupported();

library IntrospectionService {
  function supportsInterface(bytes4 interfaceId) internal view returns (bool) {
    return
      IntrospectionStorage.layout().supportedInterfaces[interfaceId] == true;
  }

  function addInterface(bytes4 interfaceId) internal {
    if (!supportsInterface(interfaceId)) {
      IntrospectionStorage.layout().supportedInterfaces[interfaceId] = true;
    } else {
      revert Introspection_AlreadySupported();
    }
  }

  function removeInterface(bytes4 interfaceId) internal {
    if (supportsInterface(interfaceId)) {
      IntrospectionStorage.layout().supportedInterfaces[interfaceId] = false;
    } else {
      revert Introspection_NotSupported();
    }
  }
}
