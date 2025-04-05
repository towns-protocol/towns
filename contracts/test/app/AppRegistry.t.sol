// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

import {IERC6900Module} from "@erc6900/reference-implementation/src/interfaces/IERC6900Module.sol";
import {ISchemaResolver} from "contracts/src/attest/interfaces/ISchemaResolver.sol";

// libraries
import {DataTypes} from "contracts/src/attest/types/DataTypes.sol";

// contracts
import {AttestationRegistry} from "contracts/src/attest/AttestationRegistry.sol";
import {SchemaRegistry} from "contracts/src/attest/SchemaRegistry.sol";
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";

// mocks
import {MockPlugin} from "contracts/test/mocks/MockPlugin.sol";
import {MockPluginResolver} from "contracts/test/mocks/MockPluginResolver.sol";

contract AppRegistryTest is BaseSetup {
    SchemaRegistry internal schemaRegistry;
    AttestationRegistry internal attestationRegistry;
    MockPluginResolver internal pluginValidator;

    bytes32 internal schemaUID;
    address internal developer;

    function setUp() public override {
        super.setUp();
        schemaRegistry = SchemaRegistry(appRegistry);
        attestationRegistry = AttestationRegistry(appRegistry);
        developer = makeAddr("developer");
        pluginValidator = new MockPluginResolver(appRegistry);
    }

    modifier givenSchema(string memory testSchema, bool revocable) {
        schemaUID = registerSchema(testSchema, address(0), revocable);
        _;
    }

    function test_registerSchema(
        string memory testSchema,
        bool revocable
    )
        external
        givenSchema(testSchema, revocable)
    {
        DataTypes.Schema memory schema = schemaRegistry.getSchema(schemaUID);
        assertEq(schema.uid, schemaUID);
        assertEq(schema.schema, testSchema);
        assertEq(schema.revocable, revocable);
    }

    function test_revertWhen_invalidSchemaResolver(string memory testSchema) external {
        MockPlugin plugin = new MockPlugin();
        vm.prank(deployer);
        vm.expectRevert(DataTypes.InvalidSchemaResolver.selector);
        schemaRegistry.register({
            schema: testSchema,
            resolver: ISchemaResolver(address(plugin)),
            revocable: false
        });
    }

    function test_revertWhen_schemaAlreadyRegistered(string memory testSchema)
        external
        givenSchema(testSchema, false)
    {
        vm.prank(deployer);
        vm.expectRevert(DataTypes.SchemaAlreadyRegistered.selector);
        schemaRegistry.register({
            schema: testSchema,
            resolver: ISchemaResolver(address(0)),
            revocable: false
        });
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Attest                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_attest() external {
        // Register a schema for plugin attestations with the following fields:
        // - plugin: address of the plugin contract
        // - pluginType: type of plugin (execution, validation, etc)
        // - moduleId: unique identifier for the plugin module
        // - audited: whether the plugin has been audited
        bytes32 schemaId = registerSchema(
            "address plugin,uint8 pluginType,string moduleId,bool audited",
            address(pluginValidator),
            false
        );

        // Deploy a mock plugin that we'll attest to
        MockPlugin plugin = new MockPlugin();

        // Encode the attestation data according to the schema
        bytes memory encodedData =
            abi.encode(plugin, DataTypes.PluginType.Execution, plugin.moduleId(), true);

        // Create the attestation request data structure
        DataTypes.AttestationRequestData memory data = DataTypes.AttestationRequestData({
            recipient: address(plugin), // The plugin contract will receive the attestation
            expirationTime: 0, // No expiration
            revocable: false, // Cannot be revoked
            refUID: DataTypes.EMPTY_UID, // No reference attestation
            data: encodedData, // The encoded plugin data
            value: 0 // No ETH value sent
        });

        // Create the full attestation request
        DataTypes.AttestationRequest memory request =
            DataTypes.AttestationRequest({schemaId: schemaId, data: data});

        // Submit the attestation as the app owner
        vm.prank(developer);
        bytes32 attestationId = attestationRegistry.attest(request);

        // Verify the resolver recorded the plugin owner correctly
        assertEq(pluginValidator.pluginOwners(address(plugin)), developer);

        // Verify the attestation was stored with correct data
        DataTypes.Attestation memory attestation = attestationRegistry.getAttestation(attestationId);
        assertEq(attestation.recipient, address(plugin));
        assertEq(attestation.attester, developer);
        assertEq(attestation.schema, schemaId);
    }

    function test_revertWhen_attestationInvalidSchema() external {
        bytes32 schemaId = _randomBytes32();
        address plugin = _randomAddress();

        DataTypes.AttestationRequestData memory data = DataTypes.AttestationRequestData({
            recipient: address(plugin), // The plugin contract will receive the attestation
            expirationTime: 0, // No expiration
            revocable: false, // Cannot be revoked
            refUID: DataTypes.EMPTY_UID, // No reference attestation
            data: "", // The encoded plugin data
            value: 0 // No ETH value sent
        });

        DataTypes.AttestationRequest memory request =
            DataTypes.AttestationRequest({schemaId: schemaId, data: data});

        vm.prank(developer);
        vm.expectRevert(DataTypes.InvalidSchema.selector);
        attestationRegistry.attest(request);
    }

    function test_revertWhen_attestationInvalidExpirationTime()
        external
        givenSchema("test", false)
    {
        address plugin = _randomAddress();
        uint64 expirationTime = uint64(block.timestamp - 1 days);

        DataTypes.AttestationRequestData memory data = DataTypes.AttestationRequestData({
            recipient: address(plugin), // The plugin contract will receive the attestation
            expirationTime: expirationTime, // Set expiration time in the future
            revocable: false, // Cannot be revoked
            refUID: DataTypes.EMPTY_UID, // No reference attestation
            data: "", // The encoded plugin data
            value: 0 // No ETH value sent
        });

        DataTypes.AttestationRequest memory request =
            DataTypes.AttestationRequest({schemaId: schemaUID, data: data});

        vm.prank(developer);
        vm.expectRevert(DataTypes.InvalidExpirationTime.selector);
        attestationRegistry.attest(request);
    }

    function test_revertWhen_attestationInvalidRevocable() external givenSchema("test", false) {
        address plugin = _randomAddress();

        DataTypes.Schema memory schema = schemaRegistry.getSchema(schemaUID);
        assertEq(schema.revocable, false);

        DataTypes.AttestationRequestData memory data = DataTypes.AttestationRequestData({
            recipient: address(plugin), // The plugin contract will receive the attestation
            expirationTime: 0, // No expiration
            revocable: true, // Can be revoked
            refUID: DataTypes.EMPTY_UID, // No reference attestation
            data: "", // The encoded plugin data
            value: 0 // No ETH value sent
        });

        DataTypes.AttestationRequest memory request =
            DataTypes.AttestationRequest({schemaId: schemaUID, data: data});

        vm.prank(developer);
        vm.expectRevert(DataTypes.Irrevocable.selector);
        attestationRegistry.attest(request);
    }

    function test_revertWhen_attestationInvalidRefUID() external givenSchema("test", false) {
        address plugin = _randomAddress();

        DataTypes.AttestationRequestData memory data = DataTypes.AttestationRequestData({
            recipient: address(plugin), // The plugin contract will receive the attestation
            expirationTime: 0, // No expiration
            revocable: false, // Cannot be revoked
            refUID: _randomBytes32(), // Invalid reference attestation
            data: "", // The encoded plugin data
            value: 0 // No ETH value sent
        });

        DataTypes.AttestationRequest memory request =
            DataTypes.AttestationRequest({schemaId: schemaUID, data: data});

        vm.prank(developer);
        vm.expectRevert(DataTypes.NotFound.selector);
        attestationRegistry.attest(request);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Revoke                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function test_revoke() external {
        MockPlugin plugin = new MockPlugin();
        (bytes32 schemaId, bytes32 attestationId) = registerApp(plugin, true);

        DataTypes.RevocationRequestData memory data =
            DataTypes.RevocationRequestData({uid: attestationId, value: 0});

        DataTypes.RevocationRequest memory request =
            DataTypes.RevocationRequest({schemaId: schemaId, data: data});

        vm.prank(developer);
        vm.expectEmit(appRegistry);
        emit DataTypes.AttestationRevoked(address(plugin), developer, attestationId, schemaId);
        attestationRegistry.revoke(request);

        DataTypes.Attestation memory attestation = attestationRegistry.getAttestation(attestationId);
        assertEq(attestation.revocationTime, block.timestamp);
        assertEq(pluginValidator.pluginOwners(address(plugin)), address(0));
    }

    function test_revertWhen_revokeInvalidSchema() external {
        bytes32 schemaId = _randomBytes32();
        bytes32 attestationId = _randomBytes32();

        DataTypes.RevocationRequestData memory data =
            DataTypes.RevocationRequestData({uid: attestationId, value: 0});

        DataTypes.RevocationRequest memory request =
            DataTypes.RevocationRequest({schemaId: schemaId, data: data});

        vm.prank(developer);
        vm.expectRevert(DataTypes.InvalidSchema.selector);
        attestationRegistry.revoke(request);
    }

    function test_revertWhen_revokeInvalidAttestation() external {
        MockPlugin plugin = new MockPlugin();
        (bytes32 schemaId,) = registerApp(plugin, true);

        DataTypes.RevocationRequestData memory data =
            DataTypes.RevocationRequestData({uid: _randomBytes32(), value: 0});

        DataTypes.RevocationRequest memory request =
            DataTypes.RevocationRequest({schemaId: schemaId, data: data});

        vm.prank(developer);
        vm.expectRevert(DataTypes.InvalidAttestation.selector);
        attestationRegistry.revoke(request);
    }

    function test_revertWhen_revokeInvalidAttestationSchema() external {
        MockPlugin plugin = new MockPlugin();
        (, bytes32 attestationId) = registerApp(plugin, true);
        bytes32 invalidSchemaId = registerSchema("test", address(0), false);

        DataTypes.RevocationRequestData memory data =
            DataTypes.RevocationRequestData({uid: attestationId, value: 0});

        DataTypes.RevocationRequest memory request =
            DataTypes.RevocationRequest({schemaId: invalidSchemaId, data: data});

        vm.prank(developer);
        vm.expectRevert(DataTypes.InvalidSchema.selector);
        attestationRegistry.revoke(request);
    }

    function test_revertWhen_revokeInvalidRevoker() external {
        MockPlugin plugin = new MockPlugin();
        (bytes32 schemaId, bytes32 attestationId) = registerApp(plugin, true);

        DataTypes.RevocationRequestData memory data =
            DataTypes.RevocationRequestData({uid: attestationId, value: 0});

        DataTypes.RevocationRequest memory request =
            DataTypes.RevocationRequest({schemaId: schemaId, data: data});

        vm.prank(_randomAddress());
        vm.expectRevert(DataTypes.InvalidRevoker.selector);
        attestationRegistry.revoke(request);
    }

    function test_revertWhen_revokeIrrevocable() external {
        MockPlugin plugin = new MockPlugin();
        (bytes32 schemaId, bytes32 attestationId) = registerApp(plugin, false);

        DataTypes.RevocationRequestData memory data =
            DataTypes.RevocationRequestData({uid: attestationId, value: 0});

        DataTypes.RevocationRequest memory request =
            DataTypes.RevocationRequest({schemaId: schemaId, data: data});

        vm.prank(developer);
        vm.expectRevert(DataTypes.Irrevocable.selector);
        attestationRegistry.revoke(request);
    }

    function test_revertWhen_revokeAlreadyRevoked() external {
        MockPlugin plugin = new MockPlugin();
        (bytes32 schemaId, bytes32 attestationId) = registerApp(plugin, true);

        DataTypes.RevocationRequestData memory data =
            DataTypes.RevocationRequestData({uid: attestationId, value: 0});

        DataTypes.RevocationRequest memory request =
            DataTypes.RevocationRequest({schemaId: schemaId, data: data});

        vm.prank(developer);
        attestationRegistry.revoke(request);

        vm.prank(developer);
        vm.expectRevert(DataTypes.InvalidRevocation.selector);
        attestationRegistry.revoke(request);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Helpers                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function registerApp(
        IERC6900Module plugin,
        bool revocable
    )
        internal
        returns (bytes32 schemaId, bytes32 attestationId)
    {
        schemaId = registerSchema(
            "address plugin,uint8 pluginType,string moduleId,bool audited",
            address(pluginValidator),
            true
        );
        bytes memory encodedData =
            abi.encode(address(plugin), DataTypes.PluginType.Execution, plugin.moduleId(), true);

        DataTypes.AttestationRequestData memory data = DataTypes.AttestationRequestData({
            recipient: address(plugin), // The plugin contract will receive the attestation
            expirationTime: 0, // No expiration
            revocable: revocable, // Can it be revoked by the developer
            refUID: DataTypes.EMPTY_UID, // No reference attestation
            data: encodedData, // The encoded plugin data
            value: 0 // No ETH value sent
        });

        DataTypes.AttestationRequest memory request =
            DataTypes.AttestationRequest({schemaId: schemaId, data: data});

        vm.prank(developer);
        attestationId = attestationRegistry.attest(request);
    }

    function registerSchema(
        string memory testSchema,
        address resolver,
        bool revocable
    )
        internal
        returns (bytes32)
    {
        DataTypes.Schema memory schema = DataTypes.Schema({
            uid: DataTypes.EMPTY_UID,
            resolver: ISchemaResolver(resolver),
            revocable: revocable,
            schema: testSchema
        });
        schema.uid = getUID(schema);

        vm.prank(deployer);
        vm.expectEmit(appRegistry);
        emit DataTypes.SchemaRegistered(schema.uid, deployer, schema);
        return schemaRegistry.register({
            schema: testSchema,
            resolver: ISchemaResolver(resolver),
            revocable: revocable
        });
    }

    function getUID(DataTypes.Schema memory schema) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(schema.schema, schema.resolver, schema.revocable));
    }
}
