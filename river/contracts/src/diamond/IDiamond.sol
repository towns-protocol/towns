// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface IDiamond {
  /// @notice Thrown when calling a function that was not registered in the diamond.
  error Diamond_UnsupportedFunction();

  /// @notice Add/replace/remove any number of functions and optionally execute
  /// @param Add Facets to add functions to.
  /// @param Replace Facets to replace functions in.
  /// @param Remove Facets to remove functions from.
  enum FacetCutAction {
    Add,
    Replace,
    Remove
  }

  /// @notice Execute a diamond cut
  /// @param facetAddress Facet to cut.
  /// @param action Enum of type FacetCutAction.
  /// @param functionSelectors Array of function selectors.
  struct FacetCut {
    address facetAddress;
    FacetCutAction action;
    bytes4[] functionSelectors;
  }
}
