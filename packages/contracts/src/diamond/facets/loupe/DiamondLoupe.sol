// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IDiamondLoupe} from "./IDiamondLoupe.sol";

// libraries

// contracts
import {DiamondLoupeController} from "./DiamondLoupeController.sol";

contract DiamondLoupe is IDiamondLoupe, DiamondLoupeController {
  /// @inheritdoc IDiamondLoupe
  function facets() external view override returns (Facet[] memory) {
    return _facets();
  }

  /// @inheritdoc IDiamondLoupe
  function facetFunctionSelectors(
    address facet
  ) external view override returns (bytes4[] memory) {
    return _facetSelectors(facet);
  }

  /// @inheritdoc IDiamondLoupe
  function facetAddresses() external view override returns (address[] memory) {
    return _facetAddresses();
  }

  /// @inheritdoc IDiamondLoupe
  function facetAddress(
    bytes4 selector
  ) external view override returns (address) {
    return _facetAddress(selector);
  }
}
