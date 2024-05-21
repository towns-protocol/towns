// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";

// libraries

// contracts

interface IDiamondCutBase {
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

  /// @notice Event emitted when facets are added/removed/replaced
  /// @param facetCuts Facet addresses and function selectors.
  /// @param init Address of contract or facet to execute initPayload.
  /// @param initPayload A function call, including function selector and arguments.
  event DiamondCut(
    IDiamond.FacetCut[] facetCuts,
    address init,
    bytes initPayload
  );
}

interface IDiamondCut is IDiamondCutBase {
  /// @notice Add/replace/remove any number of functions and optionally execute a function with delegatecall
  /// @param facetCuts Facet addresses and function selectors.
  /// @param init Address of contract or facet to execute initPayload.
  /// @param initPayload A function call, including function selector and arguments. Executed with delegatecall on init address.
  function diamondCut(
    IDiamond.FacetCut[] calldata facetCuts,
    address init,
    bytes calldata initPayload
  ) external;
}
