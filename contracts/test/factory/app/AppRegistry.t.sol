// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISchemaResolver} from "contracts/src/factory/facets/app/interfaces/ISchemaResolver.sol";

// libraries
import {DataTypes} from "contracts/src/factory/facets/app/IAppRegistry.sol";

// contracts
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";
import {AppRegistry} from "contracts/src/factory/facets/app/AppRegistry.sol";

contract AppRegistryTest is BaseSetup {
  AppRegistry registry;

  function setUp() public override {
    super.setUp();
    registry = AppRegistry(spaceFactory);
  }

  function test_registerSchema() external {
    DataTypes.Schema memory schema = DataTypes.Schema({
      uid: DataTypes.EMPTY_UID,
      resolver: ISchemaResolver(address(0)),
      definition: "address plugin,string pluginType,bool audited"
    });

    bytes32 uid = registry.registerSchema(
      "address plugin,string pluginType,bool audited",
      ISchemaResolver(address(0))
    );

    assertEq(uid, hashSchema(address(this), schema));
  }

  function hashSchema(
    address sender,
    DataTypes.Schema memory schema
  ) internal pure returns (bytes32) {
    return
      keccak256(
        abi.encodePacked(sender, schema.definition, address(schema.resolver))
      );
  }
}
