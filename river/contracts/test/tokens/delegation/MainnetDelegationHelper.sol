// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// helpers
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

// contracts
import {MainnetDelegation} from "contracts/src/tokens/river/base/delegation/MainnetDelegation.sol";

contract MainnetDelegationHelper is FacetHelper {
  MainnetDelegation internal delegation;

  constructor() {
    delegation = new MainnetDelegation();

    bytes4[] memory selectors_ = new bytes4[](5);
    selectors_[_index++] = MainnetDelegation.setDelegation.selector;
    selectors_[_index++] = MainnetDelegation.removeDelegation.selector;
    selectors_[_index++] = MainnetDelegation.getDelegationByDelegator.selector;
    selectors_[_index++] = MainnetDelegation.getDelegationsByOperator.selector;
    selectors_[_index++] = MainnetDelegation
      .getDelegatedStakeByOperator
      .selector;

    addSelectors(selectors_);
  }

  function facet() public view override returns (address) {
    return address(delegation);
  }

  function selectors() public view override returns (bytes4[] memory) {
    return functionSelectors;
  }

  function initializer() public pure override returns (bytes4) {
    return MainnetDelegation.__MainnetDelegation_init.selector;
  }
}
