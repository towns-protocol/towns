// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces
import {IDiamondCutBase} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";

// libraries
import {DiamondCutStorage} from "./DiamondCutStorage.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

abstract contract DiamondCutBase is IDiamondCutBase {
  using EnumerableSet for EnumerableSet.AddressSet;
  using EnumerableSet for EnumerableSet.Bytes32Set;

  /// @dev Performs a diamond cut.
  function _diamondCut(
    IDiamond.FacetCut[] memory facetCuts,
    address init,
    bytes memory initPayload
  ) internal {
    if (facetCuts.length == 0) revert DiamondCut_InvalidFacetCutLength();

    for (uint256 i; i < facetCuts.length; i++) {
      IDiamond.FacetCut memory facetCut = facetCuts[i];

      _validateFacetCut(facetCut);

      if (facetCut.action == IDiamond.FacetCutAction.Add) {
        _addFacet(facetCut.facetAddress, facetCut.functionSelectors);
      } else if (facetCut.action == IDiamond.FacetCutAction.Replace) {
        _replaceFacet(facetCut.facetAddress, facetCut.functionSelectors);
      } else if (facetCut.action == IDiamond.FacetCutAction.Remove) {
        _removeFacet(facetCut.facetAddress, facetCut.functionSelectors);
      }
    }

    emit DiamondCut(facetCuts, init, initPayload);

    _initializeDiamondCut(facetCuts, init, initPayload);
  }

  ///@notice Add a new facet to the diamond
  ///@param facet The facet to add
  ///@param selectors The selectors for the facet
  function _addFacet(address facet, bytes4[] memory selectors) internal {
    DiamondCutStorage.Layout storage ds = DiamondCutStorage.layout();

    // add facet to diamond storage
    if (!ds.facets.contains(facet)) ds.facets.add(facet);

    uint256 selectorCount = selectors.length;

    // add selectors to diamond storage
    for (uint256 i; i < selectorCount; ) {
      bytes4 selector = selectors[i];

      if (selector == bytes4(0)) {
        revert DiamondCut_InvalidSelector();
      }

      if (ds.facetBySelector[selector] != address(0)) {
        revert DiamondCut_FunctionAlreadyExists(selector);
      }

      ds.facetBySelector[selector] = facet;
      ds.selectorsByFacet[facet].add(selector);

      unchecked {
        i++;
      }
    }
  }

  ///@notice Remove a facet from the diamond
  ///@param facet The facet to remove
  ///@param selectors The selectors for the facet
  function _removeFacet(address facet, bytes4[] memory selectors) internal {
    DiamondCutStorage.Layout storage ds = DiamondCutStorage.layout();

    if (facet == address(this)) revert DiamondCut_ImmutableFacet();

    if (!ds.facets.contains(facet)) revert DiamondCut_InvalidFacet(facet);

    for (uint256 i; i < selectors.length; i++) {
      bytes4 selector = selectors[i];

      if (selector == bytes4(0)) {
        revert DiamondCut_InvalidSelector();
      }

      if (ds.facetBySelector[selector] != facet) {
        revert DiamondCut_InvalidFacetRemoval(facet, selector);
      }

      delete ds.facetBySelector[selector];

      ds.selectorsByFacet[facet].remove(selector);
    }

    if (ds.selectorsByFacet[facet].length() == 0) {
      ds.facets.remove(facet);
    }
  }

  /// @notice Replace a facet on the diamond
  /// @param facet The new facet
  /// @param selectors The selectors for the facet
  function _replaceFacet(address facet, bytes4[] memory selectors) internal {
    DiamondCutStorage.Layout storage ds = DiamondCutStorage.layout();

    if (facet == address(this)) revert DiamondCut_ImmutableFacet();

    if (!ds.facets.contains(facet)) ds.facets.add(facet);

    uint256 selectorCount = selectors.length;

    for (uint256 i; i < selectorCount; ) {
      bytes4 selector = selectors[i];

      if (selector == bytes4(0)) {
        revert DiamondCut_InvalidSelector();
      }

      address oldFacet = ds.facetBySelector[selector];

      if (oldFacet == address(this)) revert DiamondCut_ImmutableFacet();

      if (oldFacet == address(0)) {
        revert DiamondCut_FunctionDoesNotExist(facet);
      }

      if (oldFacet == facet) {
        revert DiamondCut_FunctionFromSameFacetAlreadyExists(selector);
      }

      // overwrite selector to new facet
      ds.facetBySelector[selector] = facet;

      ds.selectorsByFacet[oldFacet].remove(selector);

      ds.selectorsByFacet[facet].add(selector);

      if (ds.selectorsByFacet[oldFacet].length() == 0) {
        ds.facets.remove(oldFacet);
      }

      unchecked {
        i++;
      }
    }
  }

  /// @notice Validate a facet cut
  /// @param facetCut The facet cut to validate
  function _validateFacetCut(IDiamond.FacetCut memory facetCut) internal view {
    if (facetCut.facetAddress == address(0)) {
      revert DiamondCut_InvalidFacet(facetCut.facetAddress);
    }

    if (
      facetCut.facetAddress != address(this) &&
      facetCut.facetAddress.code.length == 0
    ) {
      revert DiamondCut_InvalidFacet(facetCut.facetAddress);
    }

    if (facetCut.functionSelectors.length == 0) {
      revert DiamondCut_InvalidFacetSelectors(facetCut.facetAddress);
    }
  }

  /// @notice Initialize Diamond Cut Payload
  /// @param init The init address
  /// @param initPayload The init payload
  function _initializeDiamondCut(
    IDiamond.FacetCut[] memory,
    address init,
    bytes memory initPayload
  ) internal {
    if (init == address(0)) return;

    if (init.code.length == 0) {
      revert DiamondCut_InvalidContract(init);
    }

    Address.functionDelegateCall(init, initPayload);
  }
}
