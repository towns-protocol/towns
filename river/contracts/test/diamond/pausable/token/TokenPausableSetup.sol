// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {TokenPausableFacet} from "contracts/src/diamond/facets/pausable/token/TokenPausableFacet.sol";

contract TokenPausableHelper is FacetHelper {
  TokenPausableFacet internal tokenPausable;

  constructor() {
    tokenPausable = new TokenPausableFacet();
  }

  function facet() public view override returns (address) {
    return address(tokenPausable);
  }

  function selectors() public pure override returns (bytes4[] memory) {
    bytes4[] memory selectors_ = new bytes4[](3);
    selectors_[0] = TokenPausableFacet.pause.selector;
    selectors_[1] = TokenPausableFacet.unpause.selector;
    selectors_[2] = TokenPausableFacet.paused.selector;
    return selectors_;
  }

  function initializer() public pure override returns (bytes4) {
    return TokenPausableFacet.__Pausable_init.selector;
  }
}
