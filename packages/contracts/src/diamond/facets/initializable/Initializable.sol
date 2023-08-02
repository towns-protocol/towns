// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries
import {InitializableStorage} from "./InitializableStorage.sol";
import {Address} from "openzeppelin-contracts/contracts/utils/Address.sol";

// contracts
error Initializable_AlreadyInitialized(uint8 version);
error Initializable_NotInInitializingState();
error Initializable_InInitializingState();

abstract contract Initializable {
  event Initialized(uint8 version);

  modifier initializer() {
    InitializableStorage.Layout storage ds = InitializableStorage.layout();

    bool isTopLevelCall = !ds.initializing;

    if (
      // check if the contract is already initializing
      (!isTopLevelCall || ds.initialized >= 1) &&
      // check if the contract is already initialized
      (Address.isContract(address(this)) || ds.initialized != 1)
    ) {
      revert Initializable_AlreadyInitialized(ds.initialized);
    }

    ds.initialized = 1;

    if (isTopLevelCall) {
      ds.initializing = true;
    }
    _;
    if (isTopLevelCall) {
      ds.initializing = false;
      emit Initialized(1);
    }
  }

  modifier reinitializer(uint8 version) {
    InitializableStorage.Layout storage ds = InitializableStorage.layout();
    if (ds.initializing || ds.initialized >= version) {
      revert Initializable_AlreadyInitialized(ds.initialized);
    }
    ds.initialized = version;
    ds.initializing = true;
    _;
    ds.initializing = false;
    emit Initialized(version);
  }

  modifier onlyInitializing() {
    if (!InitializableStorage.layout().initializing)
      revert Initializable_NotInInitializingState();
    _;
  }

  function _disableInitializers() internal {
    InitializableStorage.Layout storage ds = InitializableStorage.layout();
    if (ds.initializing) revert Initializable_InInitializingState();

    if (ds.initialized < type(uint8).max) {
      ds.initialized = type(uint8).max;
      emit Initialized(type(uint8).max);
    }
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
