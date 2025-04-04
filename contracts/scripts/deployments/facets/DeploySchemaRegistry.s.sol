// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {SchemaRegistry} from "contracts/src/factory/facets/app/SchemaRegistry.sol";
import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";

contract DeploySchemaRegistry is FacetHelper, Deployer {
  constructor() {
    addSelector(SchemaRegistry.register.selector);
    addSelector(SchemaRegistry.getSchema.selector);
  }

  function initializer() public pure override returns (bytes4) {
    return SchemaRegistry.__SchemaRegistry_init.selector;
  }

  function versionName() public pure override returns (string memory) {
    return "facets/schemaRegistryFacet";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    SchemaRegistry schemaRegistry = new SchemaRegistry();
    vm.stopBroadcast();
    return address(schemaRegistry);
  }
}
