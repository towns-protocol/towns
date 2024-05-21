// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IPricingModules} from "./IPricingModules.sol";

// contracts
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";
import {PricingModulesBase} from "./PricingModulesBase.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

contract PricingModulesFacet is
  IPricingModules,
  PricingModulesBase,
  OwnableBase,
  Facet
{
  function __PricingModulesFacet_init(
    address[] memory pricingModules
  ) external onlyInitializing {
    __PricingModulesFacet_init_unchained(pricingModules);
  }

  function __PricingModulesFacet_init_unchained(
    address[] memory pricingModules
  ) internal {
    _addInterface(type(IPricingModules).interfaceId);
    for (uint256 i = 0; i < pricingModules.length; i++) {
      _addPricingModule(pricingModules[i]);
    }
  }

  function addPricingModule(address pricingModule) external onlyOwner {
    _addPricingModule(pricingModule);
  }

  function isPricingModule(address module) external view returns (bool) {
    return _isPricingModule(module);
  }

  function removePricingModule(address module) external onlyOwner {
    _removePricingModule(module);
  }

  function listPricingModules() external view returns (PricingModule[] memory) {
    return _listPricingModules();
  }
}
