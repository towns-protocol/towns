// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamondLoupe, IDiamondLoupeBase} from "@towns-protocol/diamond/src/facets/loupe/IDiamondLoupe.sol";
import {IDiamondCut} from "@towns-protocol/diamond/src/facets/cut/IDiamondCut.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC173} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {IOwnablePending} from "@towns-protocol/diamond/src/facets/ownable/pending/IOwnablePending.sol";

// libraries

// contracts
import {Diamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {DiamondHelper} from "@towns-protocol/diamond/scripts/common/helpers/DiamondHelper.s.sol";
import {Interaction} from "contracts/scripts/common/Interaction.s.sol";

/// @dev note: struct fields must be in alphabetical order for the json parser to work
// see: https://book.getfoundry.sh/cheatcodes/parse-json
struct DiamondFacetData {
  string chainName;
  string diamond;
  FacetData[] facets;
  uint256 numFacets;
}

struct FacetData {
  address deployedAddress;
  string facetName;
  bytes32 sourceHash;
}

abstract contract AlphaHelper is Interaction, DiamondHelper, IDiamondLoupeBase {
  /// @notice Get addresses of core facets that should never be removed
  /// @param diamond The diamond contract address
  /// @return coreFacets An array of core facet addresses
  function getCoreFacetAddresses(
    address diamond
  ) internal view returns (address[] memory coreFacets) {
    coreFacets = new address[](5);

    coreFacets[0] = IDiamondLoupe(diamond).facetAddress(
      IDiamondCut.diamondCut.selector
    );
    coreFacets[1] = IDiamondLoupe(diamond).facetAddress(
      IDiamondLoupe.facets.selector
    );
    coreFacets[2] = IDiamondLoupe(diamond).facetAddress(
      IERC165.supportsInterface.selector
    );
    coreFacets[3] = IDiamondLoupe(diamond).facetAddress(IERC173.owner.selector);
    coreFacets[4] = IDiamondLoupe(diamond).facetAddress(
      IOwnablePending.currentOwner.selector
    );
  }

  /// @notice Check if an address is a core facet that should not be removed
  /// @param facetAddress The facet address to check
  /// @param coreFacets Array of core facet addresses
  /// @return True if the address is a core facet
  function isCoreFacet(
    address facetAddress,
    address[] memory coreFacets
  ) internal pure returns (bool) {
    for (uint256 i = 0; i < coreFacets.length; i++) {
      if (facetAddress == coreFacets[i]) {
        return true;
      }
    }
    return false;
  }

  /// @notice Execute a diamond cut to remove facets
  /// @param deployer The address that will execute the diamond cut
  /// @param diamond The diamond contract address
  function executeDiamondCut(address deployer, address diamond) internal {
    vm.broadcast(deployer);
    IDiamondCut(diamond).diamondCut(baseFacets(), address(0), "");
    clearCuts();
  }

  /// @notice Remove all non-core facets from a diamond
  /// @param deployer The address that will execute the diamond cut
  /// @param diamond The diamond contract address
  function removeRemoteFacets(address deployer, address diamond) internal {
    Facet[] memory facets = IDiamondLoupe(diamond).facets();
    address[] memory coreFacets = getCoreFacetAddresses(diamond);

    for (uint256 i; i < facets.length; i++) {
      address facet = facets[i].facet;

      if (isCoreFacet(facet, coreFacets)) {
        info("Skipping core facet: %s", facet);
        continue;
      }

      addCut(
        FacetCut({
          facetAddress: facet,
          action: FacetCutAction.Remove,
          functionSelectors: facets[i].selectors
        })
      );
    }

    executeDiamondCut(deployer, diamond);
  }

  /// @notice Remove specific facets from a diamond by address
  /// @param deployer The address that will execute the diamond cut
  /// @param diamond The diamond contract address
  /// @param facetAddresses Array of facet addresses to remove
  function removeRemoteFacetsByAddresses(
    address deployer,
    address diamond,
    address[] memory facetAddresses
  ) internal {
    addCutsToRemove(diamond, facetAddresses);
    executeDiamondCut(deployer, diamond);
  }

  /// @notice Add the facet cuts to remove from a diamond
  /// @param diamond The diamond contract address
  /// @param facetAddresses Array of facet addresses to remove
  function addCutsToRemove(
    address diamond,
    address[] memory facetAddresses
  ) internal {
    Facet[] memory facets = IDiamondLoupe(diamond).facets();
    address[] memory coreFacets = getCoreFacetAddresses(diamond);

    for (uint256 i; i < facets.length; i++) {
      address facet = facets[i].facet;

      if (isCoreFacet(facet, coreFacets)) {
        continue;
      }

      if (shouldRemoveFacet(facet, facetAddresses)) {
        addCut(
          FacetCut({
            facetAddress: facet,
            action: FacetCutAction.Remove,
            functionSelectors: facets[i].selectors
          })
        );
      }
    }
  }

  /// @notice Check if a facet should be removed based on provided addresses
  /// @param facet The facet address to check
  /// @param facetAddresses Array of facet addresses to remove
  /// @return True if the facet should be removed
  function shouldRemoveFacet(
    address facet,
    address[] memory facetAddresses
  ) internal pure returns (bool) {
    for (uint256 j = 0; j < facetAddresses.length; j++) {
      if (facet == facetAddresses[j]) return true;
    }
    return false;
  }
}
