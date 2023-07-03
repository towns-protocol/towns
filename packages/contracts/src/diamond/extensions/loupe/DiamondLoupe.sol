// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IERC165} from "../introspection/IERC165.sol";
import {IDiamondLoupe} from "./IDiamondLoupe.sol";

// libraries

// contracts
import {IntrospectionController} from "../introspection/IntrospectionController.sol";
import {DiamondLoupeController} from "./DiamondLoupeController.sol";

contract DiamondLoupe is
  IDiamondLoupe,
  IERC165,
  DiamondLoupeController,
  IntrospectionController
{
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

  /// @inheritdoc IERC165
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override returns (bool) {
    return _supportsInterface(interfaceId);
  }
}
