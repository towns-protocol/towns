// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";
import {IDiamondCut} from "./IDiamondCut.sol";

// libraries

// contracts
import {Facet} from "contracts/src/diamond/facets/Facet.sol";
import {DiamondCutBase} from "./DiamondCutBase.sol";
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";

contract DiamondCutFacet is IDiamondCut, DiamondCutBase, OwnableBase, Facet {
  function __DiamondCut_init() external onlyInitializing {
    _addInterface(type(IDiamondCut).interfaceId);
  }

  /// @inheritdoc IDiamondCut
  function diamondCut(
    IDiamond.FacetCut[] memory facetCuts,
    address init,
    bytes memory initPayload
  ) external onlyOwner reinitializer(_nextVersion()) {
    _diamondCut(facetCuts, init, initPayload);
  }
}
