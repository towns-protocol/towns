// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IMembershipPricing} from "contracts/src/spaces/facets/membership/pricing/IMembershipPricing.sol";

// libraries
import {FixedPricingStorage} from "./FixedPricingStorage.sol";

// contracts
import {IntrospectionFacet} from "contracts/src/diamond/facets/introspection/IntrospectionFacet.sol";

contract FixedPricing is IMembershipPricing, IntrospectionFacet {
  string public name = "FixedPricing";
  string public description = "Fixed pricing for membership";

  constructor() {
    __IntrospectionBase_init();
    _addInterface(type(IMembershipPricing).interfaceId);
  }

  function setPrice(uint256 price) external {
    FixedPricingStorage.layout().priceBySpace[msg.sender] = price;
  }

  function getPrice(uint256, uint256) external view returns (uint256) {
    return FixedPricingStorage.layout().priceBySpace[msg.sender];
  }
}
