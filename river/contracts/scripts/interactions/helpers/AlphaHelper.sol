// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamondLoupe, IDiamondLoupeBase} from "@river-build/diamond/src/facets/loupe/IDiamondLoupe.sol";
import {IDiamondCut} from "@river-build/diamond/src/facets/cut/IDiamondCut.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC173} from "@river-build/diamond/src/facets/ownable/IERC173.sol";
import {IOwnablePending} from "@river-build/diamond/src/facets/ownable/pending/IOwnablePending.sol";

import {Diamond} from "@river-build/diamond/src/Diamond.sol";
import {DiamondHelper} from "@river-build/diamond/scripts/common/helpers/DiamondHelper.s.sol";

// libraries

// contracts
import {Interaction} from "contracts/scripts/common/Interaction.s.sol";

// note: struct fields must be in alphabetical order for the json parser to work
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
  function removeRemoteFacets(address deployer, address diamond) internal {
    Facet[] memory facets = IDiamondLoupe(diamond).facets();

    address diamondCut = IDiamondLoupe(diamond).facetAddress(
      IDiamondCut.diamondCut.selector
    );
    address diamondLoupe = IDiamondLoupe(diamond).facetAddress(
      IDiamondLoupe.facets.selector
    );
    address introspection = IDiamondLoupe(diamond).facetAddress(
      IERC165.supportsInterface.selector
    );
    address ownable = IDiamondLoupe(diamond).facetAddress(
      IERC173.owner.selector
    );
    address ownablePending = IDiamondLoupe(diamond).facetAddress(
      IOwnablePending.currentOwner.selector
    );

    for (uint256 i; i < facets.length; i++) {
      if (
        facets[i].facet == diamondCut ||
        facets[i].facet == diamondLoupe ||
        facets[i].facet == introspection ||
        facets[i].facet == ownable ||
        facets[i].facet == ownablePending
      ) {
        info("Skipping facet: %s", facets[i].facet);
        continue;
      }

      addCut(
        FacetCut({
          facetAddress: facets[i].facet,
          action: FacetCutAction.Remove,
          functionSelectors: facets[i].selectors
        })
      );
    }

    vm.broadcast(deployer);
    IDiamondCut(diamond).diamondCut(baseFacets(), address(0), "");

    clearCuts();
  }

  function removeRemoteFacetsByAddresses(
    address deployer,
    address diamond,
    address[] memory facetAddresses
  ) internal {
    Facet[] memory facets = IDiamondLoupe(diamond).facets();

    address diamondCut = IDiamondLoupe(diamond).facetAddress(
      IDiamondCut.diamondCut.selector
    );
    address diamondLoupe = IDiamondLoupe(diamond).facetAddress(
      IDiamondLoupe.facets.selector
    );
    address introspection = IDiamondLoupe(diamond).facetAddress(
      IERC165.supportsInterface.selector
    );
    address ownable = IDiamondLoupe(diamond).facetAddress(
      IERC173.owner.selector
    );
    address ownablePending = IDiamondLoupe(diamond).facetAddress(
      IOwnablePending.currentOwner.selector
    );

    for (uint256 i; i < facets.length; i++) {
      if (
        facets[i].facet == diamondCut ||
        facets[i].facet == diamondLoupe ||
        facets[i].facet == introspection ||
        facets[i].facet == ownable ||
        facets[i].facet == ownablePending
      ) {
        info("Skipping facet: %s", facets[i].facet);
        continue;
      }

      bool shouldRemove = false;
      for (uint256 j; j < facetAddresses.length; j++) {
        if (facets[i].facet == facetAddresses[j]) {
          shouldRemove = true;
          break;
        }
      }

      if (shouldRemove) {
        addCut(
          FacetCut({
            facetAddress: facets[i].facet,
            action: FacetCutAction.Remove,
            functionSelectors: facets[i].selectors
          })
        );
      }
    }

    vm.broadcast(deployer);
    IDiamondCut(diamond).diamondCut(baseFacets(), address(0), "");

    clearCuts();
  }
}
