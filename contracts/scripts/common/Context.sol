// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

abstract contract Context {
  function isAnvil() internal view virtual returns (bool) {
    return block.chainid == 31337 || block.chainid == 31338;
  }

  function isRiver() internal view returns (bool) {
    return block.chainid == 6524490;
  }
}
