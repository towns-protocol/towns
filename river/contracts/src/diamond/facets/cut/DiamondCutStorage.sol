// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts

library DiamondCutStorage {
  // keccak256(abi.encode(uint256(keccak256("diamond.facets.cut.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0xc6b63261e9313602f31108199c5a3f80ebd1f09ec3eaeb70561a2265ce2fc900;

  /// @notice Facet cut struct
  /// @param facet Set of facets
  /// @param facetBySelector Mapping of function selectors to their facet
  /// @param selectorsByFacet Mapping of facet to function selectors
  struct Layout {
    EnumerableSet.AddressSet facets;
    mapping(bytes4 selector => address facet) facetBySelector;
    mapping(address => EnumerableSet.Bytes32Set) selectorsByFacet;
  }

  function layout() internal pure returns (Layout storage ds) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      ds.slot := slot
    }
  }
}
