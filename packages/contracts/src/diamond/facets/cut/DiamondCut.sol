// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";
import {IDiamondCut} from "./IDiamondCut.sol";

// libraries

// contracts
import {DiamondCutBase} from "./DiamondCutBase.sol";
import {OwnableService, Ownable__NotOwner} from "contracts/src/diamond/facets/ownable/OwnableService.sol";

contract DiamondCut is IDiamondCut, DiamondCutBase {
  /// @inheritdoc IDiamondCut
  function diamondCut(
    IDiamond.FacetCut[] memory facetCuts,
    address init,
    bytes memory initPayload
  ) external {
    if (!_checkDiamondCut()) revert Ownable__NotOwner(msg.sender);
    _diamondCut(facetCuts, init, initPayload);
  }

  function _checkDiamondCut() internal view virtual returns (bool) {
    return OwnableService.owner() == msg.sender;
  }
}
