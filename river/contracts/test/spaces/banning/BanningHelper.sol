// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// helpers
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {Banning} from "contracts/src/spaces/facets/banning/Banning.sol";

contract BanningHelper is FacetHelper {
  constructor() {
    bytes4[] memory selectors_ = new bytes4[](3);
    selectors_[0] = Banning.ban.selector;
    selectors_[1] = Banning.unban.selector;
    selectors_[2] = Banning.isBanned.selector;
    addSelectors(selectors_);
  }

  function facet() public pure override returns (address) {
    return address(0);
  }

  function selectors() public view override returns (bytes4[] memory) {
    return functionSelectors;
  }

  function initializer() public pure override returns (bytes4) {
    return "";
  }
}
