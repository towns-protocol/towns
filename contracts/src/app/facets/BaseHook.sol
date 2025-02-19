// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IAppHooks} from "contracts/src/app/interfaces/IAppHooks.sol";
import {HookPermissions} from "../libraries/HookManager.sol";

abstract contract BaseHook is IAppHooks {
  // Hook permissions
  HookPermissions internal _permissions;

  constructor() {
    // By default, no permissions are enabled
    _permissions = HookPermissions({
      beforeInitialize: false,
      afterInitialize: false,
      beforeRegister: false,
      afterRegister: false
    });
  }

  function getHookPermissions() external view returns (HookPermissions memory) {
    return _permissions;
  }

  // Return the selector of the called function
  function _returnSelector() internal pure returns (bytes4) {
    return msg.sig;
  }

  // Default implementations that return their selectors
  function beforeInitialize(address sender) external virtual returns (bytes4) {
    _beforeInitialize(sender);
    return _returnSelector();
  }

  function afterInitialize(address sender) external virtual returns (bytes4) {
    _afterInitialize(sender);
    return _returnSelector();
  }

  function beforeRegister(address sender) external virtual returns (bytes4) {
    _beforeRegister(sender);
    return _returnSelector();
  }

  function afterRegister(address sender) external virtual returns (bytes4) {
    _afterRegister(sender);
    return _returnSelector();
  }

  // Internal functions to be overridden by implementing contracts
  function _beforeInitialize(address sender) internal virtual {}
  function _afterInitialize(address sender) internal virtual {}
  function _beforeRegister(address sender) internal virtual {}
  function _afterRegister(address sender) internal virtual {}
}
