// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;

// interfaces
import {IDiamondCutEvents, IDiamondCut} from "contracts/src/diamond/extensions/cut/IDiamondCut.sol";
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";

// libraries
import {DiamondCutService} from "./DiamondCutService.sol";

abstract contract DiamondCutController is IDiamondCutEvents {
  /// @dev Performs a diamond cut.
  function _diamondCut(
    IDiamond.FacetCut[] memory facetCuts,
    address init,
    bytes memory initPayload
  ) internal {
    DiamondCutService.validateFacetCuts(facetCuts);

    for (uint256 i; i < facetCuts.length; i++) {
      IDiamond.FacetCut memory facetCut = facetCuts[i];

      DiamondCutService.validateFacetCut(facetCut);

      if (facetCut.action == IDiamond.FacetCutAction.Add) {
        DiamondCutService.addFacet(
          facetCut.facetAddress,
          facetCut.functionSelectors
        );
      } else if (facetCut.action == IDiamond.FacetCutAction.Replace) {
        _checkImmutable(facetCut.facetAddress, facetCut.functionSelectors);
        DiamondCutService.replaceFacet(
          facetCut.facetAddress,
          facetCut.functionSelectors
        );
      } else if (facetCut.action == IDiamond.FacetCutAction.Remove) {
        _checkImmutable(facetCut.facetAddress, facetCut.functionSelectors);
        DiamondCutService.removeFacet(
          facetCut.facetAddress,
          facetCut.functionSelectors
        );
      }
    }

    emit DiamondCut(facetCuts, init, initPayload);

    DiamondCutService.initializeDiamondCut(facetCuts, init, initPayload);
  }

  /// @dev Checks if the facet is immutable and reverts if it is.
  function _checkImmutable(
    address facet,
    bytes4[] memory selectors
  ) internal view {
    DiamondCutService.checkImmutable(facet, selectors);
  }
}
