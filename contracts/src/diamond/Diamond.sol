// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IDiamond} from "./IDiamond.sol";

// libraries

// contracts
import {Proxy} from "./proxy/Proxy.sol";
import {DiamondCutBase} from "./facets/cut/DiamondCutBase.sol";
import {DiamondLoupeBase} from "./facets/loupe/DiamondLoupeBase.sol";
import {IntrospectionBase} from "./facets/introspection/IntrospectionBase.sol";
import {Initializable} from "./facets/initializable/Initializable.sol";

contract Diamond is
  IDiamond,
  Proxy,
  DiamondCutBase,
  DiamondLoupeBase,
  IntrospectionBase,
  Initializable
{
  struct InitParams {
    FacetCut[] baseFacets;
    address init;
    bytes initData;
  }

  constructor(InitParams memory initDiamondCut) initializer {
    _diamondCut(
      initDiamondCut.baseFacets,
      initDiamondCut.init,
      initDiamondCut.initData
    );
  }

  // =============================================================
  //                           Internal
  // =============================================================
  function _getImplementation()
    internal
    view
    virtual
    override
    returns (address facet)
  {
    facet = _facetAddress(msg.sig);
    if (facet == address(0)) revert Diamond_UnsupportedFunction();
  }
}
