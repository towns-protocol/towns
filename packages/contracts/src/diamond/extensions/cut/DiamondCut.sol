// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";
import {IDiamondCut} from "./IDiamondCut.sol";

// libraries

// contracts
import {DiamondCutUpgradeable} from "./DiamondCutUpgradeable.sol";
import {OwnableService} from "contracts/src/diamond/extensions/ownable/OwnableService.sol";

contract DiamondCut is IDiamondCut, DiamondCutUpgradeable {
  /// @inheritdoc IDiamondCut
  function diamondCut(
    IDiamond.FacetCut[] memory facetCuts,
    address init,
    bytes memory initPayload
  ) external {
    if (!_canSetExtension()) revert DiamondCut_CannotSetExtension();
    _diamondCut(facetCuts, init, initPayload);
  }

  /// @dev Returns true if the extension can be set.
  function _canSetExtension() internal view virtual returns (bool) {
    return OwnableService.owner() == msg.sender;
  }
}
