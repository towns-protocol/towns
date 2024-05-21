// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IMembershipPricing} from "contracts/src/spaces/facets/membership/pricing/IMembershipPricing.sol";

// libraries

// contracts
import {IntrospectionFacet} from "contracts/src/diamond/facets/introspection/IntrospectionFacet.sol";

contract MockPricingModule is IMembershipPricing, IntrospectionFacet {
  string public name = "MockPricingModule";
  string public description = "MockPricingModule";

  constructor() {
    __IntrospectionBase_init();
    _addInterface(type(IMembershipPricing).interfaceId);
  }

  function setPrice(uint256) external pure override {
    revert("MockPricingModule: price is calculated");
  }

  function getPrice(uint256, uint256) external pure returns (uint256) {
    return 0;
  }
}
