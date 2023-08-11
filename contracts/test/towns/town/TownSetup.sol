// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {ITown} from "contracts/src/towns/facets/town/ITown.sol";

// libraries

// contracts
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {TownFacet} from "contracts/src/towns/facets/town/TownFacet.sol";

contract TownHelper is FacetHelper {
  TownFacet town;

  constructor() {
    town = new TownFacet();
  }

  function facet() public view override returns (address) {
    return address(town);
  }

  function selectors() public pure override returns (bytes4[] memory) {
    bytes4[] memory selectors_ = new bytes4[](1);
    selectors_[0] = ITown.info.selector;
    return selectors_;
  }

  function initializer() public pure override returns (bytes4) {
    return "";
  }
}
