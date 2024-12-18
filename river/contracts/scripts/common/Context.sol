// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {CommonBase} from "forge-std/Base.sol";

abstract contract Context is CommonBase {
  function isAnvil() internal view virtual returns (bool) {
    return block.chainid == 31337 || block.chainid == 31338;
  }

  function isTesting() internal view virtual returns (bool) {
    return vm.envOr("IN_TESTING", false);
  }

  function isRiver() internal view returns (bool) {
    return block.chainid == 6524490;
  }
}
