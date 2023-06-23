// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond} from "./IDiamond.sol";
import {IDiamondCut} from "./extensions/cut/IDiamondCut.sol";
import {IDiamondLoupe} from "./extensions/loupe/IDiamondLoupe.sol";
import {IERC165} from "./extensions/introspection/IERC165.sol";
import {IERC173} from "./extensions/ownable/IERC173.sol";

// libraries

// contracts
import {DiamondUpgradeable} from "./DiamondUpgradeable.sol";
import {DiamondCut} from "./extensions/cut/DiamondCut.sol";
import {DiamondLoupe} from "./extensions/loupe/DiamondLoupe.sol";
import {Ownable} from "./extensions/ownable/Ownable.sol";

abstract contract Diamond is
  IDiamond,
  DiamondUpgradeable,
  DiamondCut,
  DiamondLoupe,
  Ownable
{
  constructor() {
    __Introspection_init();
    __DiamondCutUpgradeable_init();
    __DiamondLoupe_init();
    __Ownable_init();

    bytes4[] memory selectors = new bytes4[](8);
    uint256 selectorIndex;

    // Register the diamondCut external function
    selectors[selectorIndex++] = IDiamondCut.diamondCut.selector;

    // Register the diamondLoupe external functions
    selectors[selectorIndex++] = IDiamondLoupe.facets.selector;
    selectors[selectorIndex++] = IDiamondLoupe.facetFunctionSelectors.selector;
    selectors[selectorIndex++] = IDiamondLoupe.facetAddress.selector;
    selectors[selectorIndex++] = IDiamondLoupe.facetAddresses.selector;
    selectors[selectorIndex++] = IERC165.supportsInterface.selector;

    // Register the ownable external functions
    selectors[selectorIndex++] = IERC173.owner.selector;
    selectors[selectorIndex++] = IERC173.transferOwnership.selector;

    FacetCut[] memory facetCuts = new FacetCut[](1);

    facetCuts[0] = FacetCut({
      facetAddress: address(this),
      action: FacetCutAction.Add,
      functionSelectors: selectors
    });

    _diamondCut(facetCuts, address(0), "");
    _transferOwnership(msg.sender);
  }

  // solhint-disable-next-line no-empty-blocks
  receive() external payable {}
}
