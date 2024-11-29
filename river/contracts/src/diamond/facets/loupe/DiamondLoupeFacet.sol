// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamondLoupe} from "./IDiamondLoupe.sol";

// libraries
import {DiamondLoupeBase} from "./DiamondLoupeBase.sol";

// contracts
import {Facet} from "../Facet.sol";

contract DiamondLoupeFacet is IDiamondLoupe, Facet {
  function __DiamondLoupe_init() external onlyInitializing {
    _addInterface(type(IDiamondLoupe).interfaceId);
  }

  /// @inheritdoc IDiamondLoupe
  function facets() external view override returns (Facet[] memory) {
    return DiamondLoupeBase.facets();
  }

  /// @inheritdoc IDiamondLoupe
  function facetFunctionSelectors(
    address facet
  ) external view override returns (bytes4[] memory) {
    return DiamondLoupeBase.facetSelectors(facet);
  }

  /// @inheritdoc IDiamondLoupe
  function facetAddresses() external view override returns (address[] memory) {
    return DiamondLoupeBase.facetAddresses();
  }

  /// @inheritdoc IDiamondLoupe
  function facetAddress(
    bytes4 selector
  ) external view override returns (address) {
    return DiamondLoupeBase.facetAddress(selector);
  }
}
