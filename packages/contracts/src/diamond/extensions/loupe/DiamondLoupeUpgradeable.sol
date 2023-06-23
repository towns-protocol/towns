// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamondLoupeStructs, IDiamondLoupe} from "./IDiamondLoupe.sol";

// libraries
import {IntrospectionService} from "../introspection/IntrospectionService.sol";
import {DiamondLoupeService} from "./DiamondLoupeService.sol";

// contracts

abstract contract DiamondLoupeUpgradeable is IDiamondLoupeStructs {
  function __DiamondLoupe_init() internal {
    IntrospectionService.addInterface(type(IDiamondLoupe).interfaceId);
  }

  function _facetSelectors(
    address facet
  ) internal view returns (bytes4[] memory) {
    return DiamondLoupeService.facetSelectors(facet);
  }

  function _facetAddresses() internal view returns (address[] memory) {
    return DiamondLoupeService.facetAddresses();
  }

  function _facetAddress(
    bytes4 selector
  ) internal view returns (address facetAddress) {
    return DiamondLoupeService.facetAddress(selector);
  }

  function _facets() internal view returns (Facet[] memory facets) {
    address[] memory facetAddresses = DiamondLoupeService.facetAddresses();
    uint256 facetCount = facetAddresses.length;
    facets = new Facet[](facetCount);

    for (uint256 i; i < facetCount; i++) {
      address facetAddress = facetAddresses[i];
      bytes4[] memory selectors = _facetSelectors(facetAddress);
      facets[i] = Facet({facet: facetAddress, selectors: selectors});
    }
  }
}
