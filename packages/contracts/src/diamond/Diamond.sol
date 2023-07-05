// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IDiamond} from "./IDiamond.sol";
import {IDiamondCut} from "./facets/cut/IDiamondCut.sol";
import {IDiamondLoupe} from "./facets/loupe/IDiamondLoupe.sol";
import {IERC165} from "./facets/introspection/IERC165.sol";
import {IERC173} from "./facets/ownable/IERC173.sol";

// libraries

// contracts
import {DiamondBase} from "./DiamondBase.sol";
import {DiamondCut} from "./facets/cut/DiamondCut.sol";
import {DiamondLoupe} from "./facets/loupe/DiamondLoupe.sol";
import {Ownable} from "./facets/ownable/Ownable.sol";
import {ERC165} from "./facets/introspection/ERC165.sol";

abstract contract Diamond is
  IDiamond,
  DiamondBase,
  DiamondCut,
  DiamondLoupe,
  Ownable,
  ERC165
{
  constructor() {
    bytes4[] memory selectors = new bytes4[](8);
    uint256 selectorIndex;

    // Register the DiamondCut external function
    selectors[selectorIndex++] = IDiamondCut.diamondCut.selector;

    _addInterface(type(IDiamondCut).interfaceId);

    // Register the DiamondLoupe external functions
    selectors[selectorIndex++] = IDiamondLoupe.facets.selector;
    selectors[selectorIndex++] = IDiamondLoupe.facetFunctionSelectors.selector;
    selectors[selectorIndex++] = IDiamondLoupe.facetAddress.selector;
    selectors[selectorIndex++] = IDiamondLoupe.facetAddresses.selector;

    _addInterface(type(IDiamondLoupe).interfaceId);

    // Register ERC165 external functions
    selectors[selectorIndex++] = IERC165.supportsInterface.selector;
    _addInterface(type(IERC165).interfaceId);

    // Register Ownable external functions
    selectors[selectorIndex++] = IERC173.owner.selector;
    selectors[selectorIndex++] = IERC173.transferOwnership.selector;

    _addInterface(type(IERC173).interfaceId);

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
