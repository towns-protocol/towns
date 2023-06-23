// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;

// interfaces
import {IDiamond} from "../../IDiamond.sol";

// libraries
import {DiamondCutStorage} from "./DiamondCutStorage.sol";
import {EnumerableSet} from "openzeppelin-contracts/contracts/utils/structs/EnumerableSet.sol";
import {Address} from "openzeppelin-contracts/contracts/utils/Address.sol";

// errors
error DiamondCut_InvalidSelector();
error DiamondCut_InvalidFacetCutLength();
error DiamondCut_FunctionAlreadyExists(bytes4 selector);
error DiamondCut_FunctionFromSameFacetAlreadyExists(bytes4 selector);
error DiamondCut_InvalidFacetRemoval(address facet, bytes4 selector);
error DiamondCut_FunctionDoesNotExist(address facet);
error DiamondCut_InvalidFacetCutAction();
error DiamondCut_InvalidFacet(address facet);
error DiamondCut_InvalidFacetSelectors(address facet);
error DiamondCut_ImmutableFacet();
error DiamondCut_InvalidContract(address init);

library DiamondCutService {
  using DiamondCutStorage for DiamondCutStorage.Layout;
  using EnumerableSet for EnumerableSet.AddressSet;
  using EnumerableSet for EnumerableSet.Bytes32Set;

  ///@notice Add a new facet to the diamond
  ///@param facet The facet to add
  ///@param selectors The selectors for the facet
  function addFacet(address facet, bytes4[] memory selectors) internal {
    DiamondCutStorage.Layout storage ds = DiamondCutStorage.layout();

    // add facet to diamond storage
    if (!ds.facets.contains(facet)) ds.facets.add(facet);

    // add selectors to diamond storage
    for (uint256 i; i < selectors.length; i++) {
      bytes4 selector = selectors[i];

      if (selector == bytes4(0)) {
        revert DiamondCut_InvalidSelector();
      }

      if (ds.facetBySelector[selector] != address(0)) {
        revert DiamondCut_FunctionAlreadyExists(selector);
      }

      ds.facetBySelector[selector] = facet;
      ds.selectorsByFacet[facet].add(selector);
    }
  }

  ///@notice Remove a facet from the diamond
  ///@param facet The facet to remove
  ///@param selectors The selectors for the facet
  function removeFacet(address facet, bytes4[] memory selectors) internal {
    DiamondCutStorage.Layout storage ds = DiamondCutStorage.layout();

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
  function replaceFacet(address facet, bytes4[] memory selectors) internal {
    DiamondCutStorage.Layout storage ds = DiamondCutStorage.layout();

    if (!ds.facets.contains(facet)) ds.facets.add(facet);

    for (uint256 i; i < selectors.length; i++) {
      bytes4 selector = selectors[i];

      if (selector == bytes4(0)) {
        revert DiamondCut_InvalidSelector();
      }

      address oldFacet = ds.facetBySelector[selector];

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
    }
  }

  function validateFacetCuts(
    IDiamond.FacetCut[] memory facetCuts
  ) internal pure {
    if (facetCuts.length == 0) revert DiamondCut_InvalidFacetCutLength();
  }

  /// @notice Validate a facet cut
  /// @param facetCut The facet cut to validate
  function validateFacetCut(IDiamond.FacetCut memory facetCut) internal view {
    if (uint256(facetCut.action) > 2) {
      revert DiamondCut_InvalidFacetCutAction();
    }

    if (facetCut.facetAddress == address(0)) {
      revert DiamondCut_InvalidFacet(facetCut.facetAddress);
    }

    if (
      facetCut.facetAddress != address(this) &&
      !Address.isContract(facetCut.facetAddress)
    ) {
      revert DiamondCut_InvalidFacet(facetCut.facetAddress);
    }

    if (facetCut.functionSelectors.length == 0) {
      revert DiamondCut_InvalidFacetSelectors(facetCut.facetAddress);
    }
  }

  ///@notice Check if immutable
  ///@param facet The facet to check
  function checkImmutable(address facet, bytes4[] memory) internal view {
    if (facet == address(this)) revert DiamondCut_ImmutableFacet();
  }

  /// @notice Initialize Diamond Cut Payload
  /// @param init The init address
  /// @param initPayload The init payload
  function initializeDiamondCut(
    IDiamond.FacetCut[] memory,
    address init,
    bytes memory initPayload
  ) internal {
    if (init == address(0)) return;

    if (!Address.isContract(init)) {
      revert DiamondCut_InvalidContract(init);
    }

    Address.functionDelegateCall(init, initPayload);

    // solhint-disable-next-line no-inline-assembly
    assembly {
      // get return value
      returndatacopy(0, 0, returndatasize())
      // return return value or error back to the caller
      return(0, returndatasize())
    }
  }
}
