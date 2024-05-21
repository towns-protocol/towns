// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts

library PricingModulesStorage {
  using EnumerableSet for EnumerableSet.AddressSet;

  // keccak256(abi.encode(uint256(keccak256("spaces.facets.architect.pricing.module.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant SLOT_POSITION =
    0x6438323c68a77f029335e6433efb7c07e7cd1775df0c27e75bcd3591a8bc5d00;

  struct Layout {
    // The set of all pricing modules
    EnumerableSet.AddressSet pricingModules;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = SLOT_POSITION;
    assembly {
      l.slot := slot
    }
  }
}
