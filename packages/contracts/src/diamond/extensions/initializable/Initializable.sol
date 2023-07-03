// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries
import {InitializableStorage} from "./InitializableStorage.sol";

// contracts
error Initializable_AlreadyInitialized();

abstract contract Initializable {
  using InitializableStorage for InitializableStorage.Layout;

  event Initialized(uint8 version);

  modifier initializer() {
    _setInitializedVersion(1);
    _;
  }

  modifier reinitializer(uint8 version) {
    _setInitializedVersion(version);
    _;
  }

  function _setInitializedVersion(uint8 version) internal virtual {
    InitializableStorage.Layout storage ds = InitializableStorage.layout();

    if (ds.initialized >= version) revert Initializable_AlreadyInitialized();

    ds.initialized = version;
    emit Initialized(version);
  }

  function _getInitializedVersion()
    internal
    view
    virtual
    returns (uint8 version)
  {
    version = InitializableStorage.layout().initialized;
  }
}
