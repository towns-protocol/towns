// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";

// libraries

// contracts

interface IDiamondCutEvents {
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

interface IDiamondCut is IDiamondCutEvents {
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
