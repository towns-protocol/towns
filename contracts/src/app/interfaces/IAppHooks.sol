// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {HookPermissions} from "contracts/src/app/libraries/HooksManager.sol";

// contracts
interface IAppHooksBase {
  event HookExecuted(
    address indexed hook,
    bytes4 indexed selector,
    bool success
  );

  error HookNotImplemented();
}

interface IAppHooks is IAppHooksBase {
  function getHookPermissions() external view returns (HookPermissions memory);

  // registration hooks
  function beforeRegister(address sender) external returns (bytes4);
  function afterRegister(address sender) external returns (bytes4);

  // installation hooks
  function beforeInstall(address sender) external returns (bytes4);
  function afterInstall(address sender) external returns (bytes4);

  // uninstallation hooks
  function beforeUninstall(address sender) external returns (bytes4);
  function afterUninstall(address sender) external returns (bytes4);
}
