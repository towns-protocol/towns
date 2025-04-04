// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISchemaResolver} from "contracts/src/factory/facets/app/interfaces/ISchemaResolver.sol";

// libraries
import {DataTypes} from "contracts/src/factory/facets/app/DataTypes.sol";

// contracts
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";
import {SchemaRegistry} from "contracts/src/factory/facets/app/SchemaRegistry.sol";
import {AttestationRegistry} from "contracts/src/factory/facets/app/AttestationRegistry.sol";

// mocks
import {MockPlugin} from "contracts/test/mocks/MockPlugin.sol";
import {MockPluginResolver} from "contracts/test/mocks/MockPluginResolver.sol";
contract AppRegistryTest is BaseSetup {
  SchemaRegistry schemaRegistry;
  AttestationRegistry attestationRegistry;

  bytes32 schemaUID;

  address appOwner;

  function setUp() public override {
    super.setUp();
    schemaRegistry = SchemaRegistry(spaceFactory);
    attestationRegistry = AttestationRegistry(spaceFactory);
    appOwner = makeAddr("appOwner");
  }

  modifier givenSchema(string memory testSchema) {
    schemaUID = mockSchema(testSchema, address(0));
    _;
  }

  function test_registerSchema(
    string memory testSchema
  ) external givenSchema(testSchema) {
    DataTypes.Schema memory schema = schemaRegistry.getSchema(schemaUID);
    assertEq(schema.uid, schemaUID);
    assertEq(schema.schema, testSchema);
    assertEq(schema.revocable, false);
  }

  function test_attest() external {
    // Deploy a mock resolver that will validate plugin attestations
    MockPluginResolver resolver = new MockPluginResolver();

    // Register a schema for plugin attestations with the following fields:
    // - plugin: address of the plugin contract
    // - pluginType: type of plugin (execution, validation, etc)
    // - moduleId: unique identifier for the plugin module
    // - audited: whether the plugin has been audited
    bytes32 schemaId = mockSchema(
      "address plugin,uint8 pluginType,string moduleId,bool audited",
      address(resolver)
    );

    // Deploy a mock plugin that we'll attest to
    MockPlugin plugin = new MockPlugin();

    // Encode the attestation data according to the schema
    bytes memory encodedData = abi.encode(
      plugin,
      DataTypes.PluginType.Execution,
      plugin.moduleId(),
      true
    );

    // Create the attestation request data structure
    DataTypes.AttestationRequestData memory data = DataTypes
      .AttestationRequestData({
        recipient: address(plugin), // The plugin contract will receive the attestation
        expirationTime: 0, // No expiration
        revocable: false, // Cannot be revoked
        refUID: DataTypes.EMPTY_UID, // No reference attestation
        data: encodedData, // The encoded plugin data
        value: 0 // No ETH value sent
      });

    // Create the full attestation request
    DataTypes.AttestationRequest memory request = DataTypes.AttestationRequest({
      schemaId: schemaId,
      data: data
    });

    // Submit the attestation as the app owner
    vm.prank(appOwner);
    bytes32 appId = attestationRegistry.attest(request);

    // Verify the resolver recorded the plugin owner correctly
    assertEq(resolver.pluginOwners(address(plugin)), appOwner);

    // Verify the attestation was stored with correct data
    DataTypes.Attestation memory attestation = attestationRegistry
      .getAttestation(appId);
    assertEq(attestation.recipient, address(plugin));
    assertEq(attestation.attester, appOwner);
    assertEq(attestation.schema, schemaId);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           Helpers                          */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
  function mockSchema(
    string memory testSchema,
    address resolver
  ) internal returns (bytes32) {
    DataTypes.Schema memory schema = DataTypes.Schema({
      uid: DataTypes.EMPTY_UID,
      resolver: ISchemaResolver(resolver),
      revocable: false,
      schema: testSchema
    });
    schema.uid = getUID(schema);

    vm.prank(deployer);
    vm.expectEmit(spaceFactory);
    emit DataTypes.SchemaRegistered(schema.uid, deployer, schema);
    return
      schemaRegistry.register({
        schema: testSchema,
        resolver: ISchemaResolver(resolver),
        revocable: false
      });
  }

  function getUID(
    DataTypes.Schema memory schema
  ) internal pure returns (bytes32) {
    return
      keccak256(
        abi.encodePacked(schema.schema, schema.resolver, schema.revocable)
      );
  }
}
