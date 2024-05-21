// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {console} from "forge-std/console.sol";

// contracts
import {CommonBase} from "forge-std/Base.sol";

abstract contract DeployHelpers is CommonBase {
  bool internal DEBUG = vm.envOr("DEBUG", false);

  // =============================================================
  //                      LOGGING HELPERS
  // =============================================================

  function debug(string memory message) internal view {
    if (DEBUG) {
      console.log(string.concat("[DEBUG]: ", message));
    }
  }

  function debug(string memory message, string memory arg) internal view {
    if (DEBUG) {
      console.log(string.concat("[DEBUG]: ", message), arg);
    }
  }

  function debug(string memory message, address arg) internal view {
    if (DEBUG) {
      console.log(string.concat("[DEBUG]: ", message), arg);
    }
  }

  function info(string memory message, string memory arg) internal view {
    console.log(string.concat("[INFO]: ", message), arg);
  }

  function info(string memory message, address arg) internal view {
    console.log(string.concat("[INFO]: ", unicode"✅ ", message), arg);
  }

  function warn(string memory message, address arg) internal view {
    console.log(string.concat("[WARN]: ", unicode"⚠️ ", message), arg);
  }

  // =============================================================
  //                           FFI HELPERS
  // =============================================================

  function ffi(string memory cmd) internal returns (bytes memory results) {
    string[] memory commandInput = new string[](1);
    commandInput[0] = cmd;
    return vm.ffi(commandInput);
  }

  function ffi(
    string memory cmd,
    string memory arg
  ) internal returns (bytes memory results) {
    string[] memory commandInput = new string[](2);
    commandInput[0] = cmd;
    commandInput[1] = arg;
    return vm.ffi(commandInput);
  }

  function ffi(
    string memory cmd,
    string memory arg1,
    string memory arg2
  ) internal returns (bytes memory results) {
    string[] memory commandInput = new string[](3);
    commandInput[0] = cmd;
    commandInput[1] = arg1;
    commandInput[2] = arg2;
    return vm.ffi(commandInput);
  }

  function ffi(
    string memory cmd,
    string memory arg1,
    string memory arg2,
    string memory arg3
  ) internal returns (bytes memory results) {
    string[] memory commandInput = new string[](4);
    commandInput[0] = cmd;
    commandInput[1] = arg1;
    commandInput[2] = arg2;
    commandInput[3] = arg3;
    return vm.ffi(commandInput);
  }

  function ffi(
    string memory cmd,
    string memory arg1,
    string memory arg2,
    string memory arg3,
    string memory arg4
  ) internal returns (bytes memory results) {
    string[] memory commandInput = new string[](5);
    commandInput[0] = cmd;
    commandInput[1] = arg1;
    commandInput[2] = arg2;
    commandInput[3] = arg3;
    commandInput[4] = arg4;
    return vm.ffi(commandInput);
  }

  // =============================================================
  //                     FILE SYSTEM HELPERS
  // =============================================================
  function exists(string memory path) internal returns (bool) {
    return vm.exists(path);
  }

  function createDir(string memory path) internal {
    if (!exists(path)) {
      debug("creating directory: ", path);
      ffi("mkdir", "-p", path);
    }
  }
}
