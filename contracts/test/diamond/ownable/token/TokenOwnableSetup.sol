// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {TokenOwnableFacet} from "contracts/src/diamond/facets/ownable/token/TokenOwnableFacet.sol";

contract TokenOwnableHelper is FacetHelper {
  TokenOwnableFacet internal tokenOwnable;

  constructor() {
    tokenOwnable = new TokenOwnableFacet();
  }

  function facet() public view override returns (address) {
    return address(tokenOwnable);
  }

  function selectors() public pure override returns (bytes4[] memory) {
    bytes4[] memory selectors_ = new bytes4[](2);
    selectors_[0] = TokenOwnableFacet.owner.selector;
    selectors_[1] = TokenOwnableFacet.transferOwnership.selector;
    return selectors_;
  }

  function initializer() public pure override returns (bytes4) {
    return TokenOwnableFacet.__Ownable_init.selector;
  }
}
