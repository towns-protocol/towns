// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {MinimalERC20Storage} from "@river-build/diamond/src/primitive/ERC20.sol";

library ERC20Storage {
  // keccak256(abi.encode(uint256(keccak256("diamond.facets.token.ERC20")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0x75807d58f669e9353223f5da7969ad5cf5c08f899e1a3ffa65554aaa556cbc00;

  struct Layout {
    MinimalERC20Storage inner;
    string name;
    string symbol;
    uint8 decimals;
  }

  function layout() internal pure returns (Layout storage l) {
    assembly {
      l.slot := STORAGE_SLOT
    }
  }
}
