// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamondLoupeBase} from "./IDiamondLoupe.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {DiamondCutStorage} from "../cut/DiamondCutStorage.sol";

// contracts

abstract contract DiamondLoupeBase is IDiamondLoupeBase {
  using EnumerableSet for EnumerableSet.AddressSet;
  using EnumerableSet for EnumerableSet.Bytes32Set;

  function _facetSelectors(
    address facet
  ) internal view returns (bytes4[] memory selectors) {
    EnumerableSet.Bytes32Set storage facetSelectors_ = DiamondCutStorage
      .layout()
      .selectorsByFacet[facet];
    uint256 selectorCount = facetSelectors_.length();

    selectors = new bytes4[](selectorCount);
    for (uint256 i; i < selectorCount; ) {
      selectors[i] = bytes4(facetSelectors_.at(i));

      unchecked {
        i++;
      }
    }
  }

  function _facetAddresses() internal view returns (address[] memory) {
    return DiamondCutStorage.layout().facets.values();
  }

  function _facetAddress(
    bytes4 selector
  ) internal view returns (address facetAddress) {
    return DiamondCutStorage.layout().facetBySelector[selector];
  }

  function _facets() internal view returns (Facet[] memory facets) {
    address[] memory facetAddresses = _facetAddresses();
    uint256 facetCount = facetAddresses.length;
    facets = new Facet[](facetCount);

    for (uint256 i; i < facetCount; ) {
      address facetAddress = facetAddresses[i];
      bytes4[] memory selectors = _facetSelectors(facetAddress);
      facets[i] = Facet({facet: facetAddress, selectors: selectors});

      unchecked {
        i++;
      }
    }
  }
}
