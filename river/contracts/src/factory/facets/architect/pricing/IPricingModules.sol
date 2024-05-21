// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface IPricingModulesBase {
  // =============================================================
  //                           Structs
  // =============================================================
  struct PricingModule {
    string name;
    string description;
    address module;
  }

  // =============================================================
  //                           Errors
  // =============================================================
  error InvalidPricingModule(address module);

  // =============================================================
  //                           Events
  // =============================================================
  event PricingModuleAdded(address indexed module);
  event PricingModuleUpdated(address indexed module);
  event PricingModuleRemoved(address indexed module);
}

interface IPricingModules is IPricingModulesBase {
  function isPricingModule(address module) external view returns (bool);

  function addPricingModule(address module) external;

  function removePricingModule(address module) external;

  function listPricingModules() external view returns (PricingModule[] memory);
}
