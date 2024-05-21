// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts

library EntitlementCheckerStorage {
  // keccak256(abi.encode(uint256(keccak256("facets.entitlement.checker.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0x180c1d0b9e5eeea9f2f078bc2712cd77acc6afea03b37705abe96dda6f602600;

  struct Layout {
    EnumerableSet.AddressSet nodes;
    mapping(address node => address operator) operatorByNode;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}
