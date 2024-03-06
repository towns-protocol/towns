// SPDX-License-Identifier: MIT
pragma solidity >=0.8.23;

import {InitializableStorage} from "./InitializableStorage.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

error Initializable_AlreadyInitialized(uint32 version);
error Initializable_NotInInitializingState();
error Initializable_InInitializingState();

abstract contract Initializable {
  event Initialized(uint32 version);

  modifier initializer() {
    InitializableStorage.Layout storage s = InitializableStorage.layout();

    bool isTopLevelCall = !s.initializing;
    if (isTopLevelCall ? s.version >= 1 : _isNotConstructor()) {
      revert Initializable_AlreadyInitialized(s.version);
    }
    s.version = 1;
    if (isTopLevelCall) {
      s.initializing = true;
    }
    _;
    if (isTopLevelCall) {
      s.initializing = false;
      emit Initialized(1);
    }
  }

  modifier reinitializer(uint32 version) {
    InitializableStorage.Layout storage s = InitializableStorage.layout();

    if (s.initializing || s.version >= version) {
      revert Initializable_AlreadyInitialized(s.version);
    }
    s.version = version;
    s.initializing = true;
    _;
    s.initializing = false;
    emit Initialized(version);
  }

  modifier onlyInitializing() {
    if (!InitializableStorage.layout().initializing)
      revert Initializable_NotInInitializingState();
    _;
  }

  function _getInitializedVersion()
    internal
    view
    virtual
    returns (uint32 version)
  {
    version = InitializableStorage.layout().version;
  }

  function _nextVersion() internal view returns (uint32) {
    return InitializableStorage.layout().version + 1;
  }

  function _disableInitializers() internal {
    InitializableStorage.Layout storage s = InitializableStorage.layout();
    if (s.initializing) revert Initializable_InInitializingState();

    if (s.version < type(uint32).max) {
      s.version = type(uint32).max;
      emit Initialized(type(uint32).max);
    }
  }

  function _isNotConstructor() private view returns (bool) {
    return address(this).code.length != 0;
  }
}
