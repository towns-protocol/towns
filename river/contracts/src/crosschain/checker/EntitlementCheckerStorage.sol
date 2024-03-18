// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts

library EntitlementCheckerStorage {
  // keccak256(abi.encode(uint256(keccak256("crosschain.checker.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0xd81aa39f2c69e22832907b5e1d674eb68a0f37869e4d0826e20ae096d0284000;

  struct Layout {
    EnumerableSet.AddressSet nodes;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}
