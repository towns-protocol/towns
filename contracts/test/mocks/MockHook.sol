// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {BaseHook} from "contracts/src/app/facets/BaseHook.sol";

// libraries

// contracts

contract MockAppHook is BaseHook {
  bool private shouldFail;

  function setShouldFail(bool _shouldFail) external {
    shouldFail = _shouldFail;
  }

  function setPermission(
    bool beforeRegister,
    bool afterRegister,
    bool beforeInstall,
    bool afterInstall,
    bool beforeUninstall,
    bool afterUninstall
  ) external {
    _permissions.beforeRegister = beforeRegister;
    _permissions.afterRegister = afterRegister;
    _permissions.beforeInstall = beforeInstall;
    _permissions.afterInstall = afterInstall;
    _permissions.beforeUninstall = beforeUninstall;
    _permissions.afterUninstall = afterUninstall;
  }

  function _beforeRegister(address) internal view override {
    if (shouldFail) {
      revert HookNotImplemented();
    }
  }

  function _afterRegister(address) internal view override {
    if (shouldFail) {
      revert HookNotImplemented();
    }
  }

  function _beforeInstall(address) internal view override {
    if (shouldFail) {
      revert HookNotImplemented();
    }
  }

  function _afterInstall(address) internal view override {
    if (shouldFail) {
      revert HookNotImplemented();
    }
  }

  function _beforeUninstall(address) internal view override {
    if (shouldFail) {
      revert HookNotImplemented();
    }
  }

  function _afterUninstall(address) internal view override {
    if (shouldFail) {
      revert HookNotImplemented();
    }
  }
}
