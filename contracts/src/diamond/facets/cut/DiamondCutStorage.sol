// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries
import {EnumerableSet} from "openzeppelin-contracts/contracts/utils/structs/EnumerableSet.sol";

// contracts

library DiamondCutStorage {
  // solhint-disable-next-line private-vars-leading-underscore
  bytes32 internal constant STORAGE_SLOT =
    keccak256("towns.diamond.facets.cut.DiamondCutStorage");

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
