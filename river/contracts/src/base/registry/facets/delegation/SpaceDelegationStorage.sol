// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts

library SpaceDelegationStorage {
  // keccak256(abi.encode(uint256(keccak256("facets.registry.space.delegation.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0x3355c1fbe959688d71c13b5c967b2a46ceae34fb425fbcad0cb6451b53f36e00;

  struct Layout {
    // References
    uint256 stakeRequirement;
    address spaceOwnerRegistry;
    address riverToken;
    address mainnetDelegation;
    // Delegation Mappings
    mapping(address operator => EnumerableSet.AddressSet) spacesByOperator;
    mapping(address space => address operator) operatorBySpace;
    mapping(address space => uint256) spaceDelegationTime;
  }

  function layout() internal pure returns (Layout storage s) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      s.slot := slot
    }
  }
}
