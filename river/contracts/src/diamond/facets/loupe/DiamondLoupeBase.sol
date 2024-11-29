// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamondLoupeBase} from "./IDiamondLoupe.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {DiamondCutStorage} from "../cut/DiamondCutStorage.sol";

// contracts

library DiamondLoupeBase {
  using EnumerableSet for EnumerableSet.AddressSet;
  using EnumerableSet for EnumerableSet.Bytes32Set;

  function facetSelectors(
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

  function facetAddresses()
    internal
    view
    returns (address[] memory _facetAddresses)
  {
    return DiamondCutStorage.layout().facets.values();
  }

  function facetAddress(
    bytes4 selector
  ) internal view returns (address _facetAddress) {
    return DiamondCutStorage.layout().facetBySelector[selector];
  }

  function facets()
    internal
    view
    returns (IDiamondLoupeBase.Facet[] memory _facets)
  {
    address[] memory _facetAddresses = facetAddresses();
    uint256 facetCount = _facetAddresses.length;
    _facets = new IDiamondLoupeBase.Facet[](facetCount);

    for (uint256 i; i < facetCount; ) {
      address _facetAddress = _facetAddresses[i];
      bytes4[] memory selectors = facetSelectors(_facetAddress);
      _facets[i] = IDiamondLoupeBase.Facet({
        facet: _facetAddress,
        selectors: selectors
      });

      unchecked {
        i++;
      }
    }
  }
}
