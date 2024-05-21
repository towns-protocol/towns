// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamondLoupe} from "./IDiamondLoupe.sol";

// libraries

// contracts
import {DiamondLoupeBase} from "./DiamondLoupeBase.sol";
import {Facet} from "../Facet.sol";

contract DiamondLoupeFacet is IDiamondLoupe, DiamondLoupeBase, Facet {
  function __DiamondLoupe_init() external onlyInitializing {
    _addInterface(type(IDiamondLoupe).interfaceId);
  }

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
