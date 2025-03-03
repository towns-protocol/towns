// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IAppHooks} from "contracts/src/app/interfaces/IAppHooks.sol";
import {HookPermissions} from "../libraries/HooksManager.sol";

abstract contract BaseHook is IAppHooks {
  // Hook permissions
  HookPermissions internal _permissions;

  constructor() {
    // By default, no permissions are enabled
    _permissions = HookPermissions({
      beforeRegister: false,
      afterRegister: false,
      beforeInstall: false,
      afterInstall: false,
      beforeUninstall: false,
      afterUninstall: false
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
  function beforeRegister(address sender) external virtual returns (bytes4) {
    _beforeRegister(sender);
    return _returnSelector();
  }

  function afterRegister(address sender) external virtual returns (bytes4) {
    _afterRegister(sender);
    return _returnSelector();
  }

  function beforeInstall(address sender) external virtual returns (bytes4) {
    _beforeInstall(sender);
    return _returnSelector();
  }

  function afterInstall(address sender) external virtual returns (bytes4) {
    _afterInstall(sender);
    return _returnSelector();
  }

  function beforeUninstall(address sender) external virtual returns (bytes4) {
    _beforeUninstall(sender);
    return _returnSelector();
  }

  function afterUninstall(address sender) external virtual returns (bytes4) {
    _afterUninstall(sender);
    return _returnSelector();
  }

  // Internal functions to be overridden by implementing contracts
  function _beforeRegister(address sender) internal virtual {}
  function _afterRegister(address sender) internal virtual {}
  function _beforeInstall(address sender) internal virtual {}
  function _afterInstall(address sender) internal virtual {}
  function _beforeUninstall(address sender) internal virtual {}
  function _afterUninstall(address sender) internal virtual {}
}
