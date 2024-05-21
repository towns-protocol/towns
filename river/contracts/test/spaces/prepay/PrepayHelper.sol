// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// helpers
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

// contracts
import {PrepayFacet} from "contracts/src/factory/facets/prepay/PrepayFacet.sol";

contract PrepayHelper is FacetHelper {
  PrepayFacet internal prepay;

  constructor() FacetHelper() {
    prepay = new PrepayFacet();
  }

  function facet() public view override returns (address) {
    return address(prepay);
  }

  function selectors() public view override returns (bytes4[] memory) {
    bytes4[] memory selectors_ = new bytes4[](3);
    uint256 index;

    selectors_[index++] = prepay.prepayMembership.selector;
    selectors_[index++] = prepay.calculateMembershipPrepayFee.selector;
    selectors_[index++] = prepay.prepaidMembershipSupply.selector;

    return selectors_;
  }

  function initializer() public view override returns (bytes4) {
    return prepay.__PrepayFacet_init.selector;
  }
}
