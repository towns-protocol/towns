// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC6900Module} from "@erc6900/reference-implementation/interfaces/IERC6900Module.sol";
import {ISchemaRegistry} from "@ethereum-attestation-service/eas-contracts/ISchemaRegistry.sol";
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";
import {ISchemaBase} from "src/apps/facets/schema/ISchema.sol";
import {IAttestationRegistryBase} from "src/apps/facets/attest/IAttestationRegistry.sol";

// types
import {Attestation, EMPTY_UID, NotFound} from "@ethereum-attestation-service/eas-contracts/Common.sol";
import {AttestationRequest, AttestationRequestData, IEAS, RevocationRequest, RevocationRequestData} from "@ethereum-attestation-service/eas-contracts/IEAS.sol";
import {SchemaRecord} from "@ethereum-attestation-service/eas-contracts/ISchemaRegistry.sol";

// contracts
import {TestUtils} from "@towns-protocol/diamond/test/TestUtils.sol";
import {DeployFacet} from "@towns-protocol/diamond/scripts/common/DeployFacet.s.sol";
import {DeployMockDiamond} from "scripts/deployments/utils/DeployMockDiamond.s.sol";
import {DeployAttestationRegistry} from "scripts/deployments/facets/DeployAttestationRegistry.s.sol";
import {DeploySchemaRegistry} from "scripts/deployments/facets/DeploySchemaRegistry.s.sol";

import {AttestationRegistry} from "src/apps/facets/attest/AttestationRegistry.sol";
import {SchemaRegistry} from "src/apps/facets/schema/SchemaRegistry.sol";

// mocks
import {MockPlugin} from "test/mocks/MockPlugin.sol";
import {MockPluginResolver, MockPayableResolver} from "test/mocks/MockResolvers.sol";

contract AttestationRegistryTest is TestUtils, IAttestationRegistryBase, ISchemaBase {
    DeployMockDiamond diamondHelper = new DeployMockDiamond();
    DeployFacet facetHelper = new DeployFacet();

    address diamond;
    address deployer;

    SchemaRegistry internal schemaRegistry;
    AttestationRegistry internal attestationRegistry;
    MockPluginResolver internal pluginValidator;

    bytes32 internal schemaUID;
    address internal developer;

    enum PluginType {
        Validation,
        Execution,
        Both
    }

    function setUp() public {
        deployer = getDeployer();

        address attestationAddress = facetHelper.deploy("AttestationRegistry", deployer);
        address schemaAddress = facetHelper.deploy("SchemaRegistry", deployer);

        diamondHelper.addCut(
            DeployAttestationRegistry.makeCut(attestationAddress, IDiamond.FacetCutAction.Add)
        );
        diamondHelper.addCut(
            DeploySchemaRegistry.makeCut(schemaAddress, IDiamond.FacetCutAction.Add)
        );
        diamond = diamondHelper.deploy(deployer);

        schemaRegistry = SchemaRegistry(diamond);
        attestationRegistry = AttestationRegistry(diamond);
        developer = makeAddr("developer");
        pluginValidator = new MockPluginResolver(diamond);
    }

    modifier givenSchema(string memory testSchema, bool revocable) {
        vm.assume(bytes(testSchema).length > 0);
        schemaUID = registerSchema(testSchema, address(0), revocable);
        _;
    }

    function test_registerSchema(
        string memory testSchema,
        bool revocable
    ) external givenSchema(testSchema, revocable) {
        SchemaRecord memory schema = schemaRegistry.getSchema(schemaUID);
        assertEq(schema.uid, schemaUID);
        assertEq(schema.schema, testSchema);
        assertEq(schema.revocable, revocable);
    }

    function test_revertWhen_emptySchema() external {
        vm.prank(deployer);
        vm.expectRevert(ISchemaBase.InvalidSchema.selector);
        schemaRegistry.register("", ISchemaResolver(address(0)), false);
    }

    function test_revertWhen_invalidSchemaResolver(string memory testSchema) external {
        vm.assume(bytes(testSchema).length > 0);
        MockPlugin plugin = new MockPlugin(_randomAddress());
        vm.prank(deployer);
        vm.expectRevert(ISchemaBase.InvalidSchemaResolver.selector);
        schemaRegistry.register({
            schema: testSchema,
            resolver: ISchemaResolver(address(plugin)),
            revocable: false
        });
    }

    function test_revertWhen_schemaAlreadyRegistered(
        string memory testSchema
    ) external givenSchema(testSchema, false) {
        vm.prank(deployer);
        vm.expectRevert(ISchemaBase.SchemaAlreadyRegistered.selector);
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
        MockPlugin plugin = new MockPlugin(_randomAddress());

        // Encode the attestation data according to the schema
        bytes memory encodedData = abi.encode(
            plugin,
            PluginType.Execution,
            plugin.moduleId(),
            true
        );

        // Create the attestation request data structure
        AttestationRequestData memory data = AttestationRequestData({
            recipient: address(plugin), // The plugin contract will receive the attestation
            expirationTime: 0, // No expiration
            revocable: false, // Cannot be revoked
            refUID: EMPTY_UID, // No reference attestation
            data: encodedData, // The encoded plugin data
            value: 0 // No ETH value sent
        });

        // Create the full attestation request
        AttestationRequest memory request = AttestationRequest({schema: schemaId, data: data});

        // Submit the attestation as the app owner
        vm.prank(developer);
        bytes32 attestationId = attestationRegistry.attest(request);

        // Verify the resolver recorded the plugin owner correctly
        assertEq(pluginValidator.pluginOwners(address(plugin)), developer);

        // Verify the attestation was stored with correct data
        Attestation memory attestation = attestationRegistry.getAttestation(attestationId);
        assertEq(attestation.recipient, address(plugin));
        assertEq(attestation.attester, developer);
        assertEq(attestation.schema, schemaId);
    }

    function test_revertWhen_attestationInvalidSchema() external {
        bytes32 schemaId = "test";
        address plugin = _randomAddress();

        AttestationRequestData memory data = AttestationRequestData({
            recipient: address(plugin), // The plugin contract will receive the attestation
            expirationTime: 0, // No expiration
            revocable: false, // Cannot be revoked
            refUID: EMPTY_UID, // No reference attestation
            data: "", // The encoded plugin data
            value: 0 // No ETH value sent
        });

        AttestationRequest memory request = AttestationRequest({schema: schemaId, data: data});

        vm.prank(developer);
        vm.expectRevert(InvalidAttestationSchema.selector);
        attestationRegistry.attest(request);
    }

    function test_revertWhen_attestationInvalidExpirationTime()
        external
        givenSchema("test", false)
    {
        address plugin = _randomAddress();
        uint64 expirationTime = uint64(block.timestamp - 1 days);

        AttestationRequestData memory data = AttestationRequestData({
            recipient: address(plugin), // The plugin contract will receive the attestation
            expirationTime: expirationTime, // Set expiration time in the future
            revocable: false, // Cannot be revoked
            refUID: EMPTY_UID, // No reference attestation
            data: "", // The encoded plugin data
            value: 0 // No ETH value sent
        });

        AttestationRequest memory request = AttestationRequest({schema: schemaUID, data: data});

        vm.prank(developer);
        vm.expectRevert(InvalidExpirationTime.selector);
        attestationRegistry.attest(request);
    }

    function test_revertWhen_attestationInvalidRevocable() external givenSchema("test", false) {
        address plugin = _randomAddress();

        SchemaRecord memory schema = schemaRegistry.getSchema(schemaUID);
        assertEq(schema.revocable, false);

        AttestationRequestData memory data = AttestationRequestData({
            recipient: address(plugin), // The plugin contract will receive the attestation
            expirationTime: 0, // No expiration
            revocable: true, // Can be revoked
            refUID: EMPTY_UID, // No reference attestation
            data: "", // The encoded plugin data
            value: 0 // No ETH value sent
        });

        AttestationRequest memory request = AttestationRequest({schema: schemaUID, data: data});

        vm.prank(developer);
        vm.expectRevert(Irrevocable.selector);
        attestationRegistry.attest(request);
    }

    function test_revertWhen_attestationInvalidRefUID() external givenSchema("test", false) {
        address plugin = _randomAddress();

        AttestationRequestData memory data = AttestationRequestData({
            recipient: address(plugin), // The plugin contract will receive the attestation
            expirationTime: 0, // No expiration
            revocable: false, // Cannot be revoked
            refUID: _randomBytes32(), // Invalid reference attestation
            data: "", // The encoded plugin data
            value: 0 // No ETH value sent
        });

        AttestationRequest memory request = AttestationRequest({schema: schemaUID, data: data});

        vm.prank(developer);
        vm.expectRevert(InvalidAttestation.selector);
        attestationRegistry.attest(request);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Revoke                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function test_revoke() external {
        MockPlugin plugin = new MockPlugin(_randomAddress());
        (bytes32 schemaId, bytes32 attestationId) = registerApp(plugin, true);

        RevocationRequestData memory data = RevocationRequestData({uid: attestationId, value: 0});

        RevocationRequest memory request = RevocationRequest({schema: schemaId, data: data});

        vm.prank(developer);
        vm.expectEmit(diamond);
        emit IEAS.Revoked(address(plugin), developer, attestationId, schemaId);
        attestationRegistry.revoke(request);

        Attestation memory attestation = attestationRegistry.getAttestation(attestationId);
        assertEq(attestation.revocationTime, block.timestamp);
        assertEq(pluginValidator.pluginOwners(address(plugin)), address(0));
    }

    function test_revertWhen_revokeInvalidSchema() external {
        bytes32 schemaId = _randomBytes32();
        bytes32 attestationId = _randomBytes32();

        RevocationRequestData memory data = RevocationRequestData({uid: attestationId, value: 0});

        RevocationRequest memory request = RevocationRequest({schema: schemaId, data: data});

        vm.prank(developer);
        vm.expectRevert(InvalidAttestationSchema.selector);
        attestationRegistry.revoke(request);
    }

    function test_revertWhen_revokeInvalidAttestation() external {
        MockPlugin plugin = new MockPlugin(_randomAddress());
        (bytes32 schemaId, ) = registerApp(plugin, true);

        RevocationRequestData memory data = RevocationRequestData({
            uid: _randomBytes32(),
            value: 0
        });

        RevocationRequest memory request = RevocationRequest({schema: schemaId, data: data});

        vm.prank(developer);
        vm.expectRevert(InvalidAttestation.selector);
        attestationRegistry.revoke(request);
    }

    function test_revertWhen_revokeInvalidAttestationSchema() external {
        MockPlugin plugin = new MockPlugin(_randomAddress());
        (, bytes32 attestationId) = registerApp(plugin, true);
        bytes32 invalidSchemaId = registerSchema("test", address(0), false);

        RevocationRequestData memory data = RevocationRequestData({uid: attestationId, value: 0});

        RevocationRequest memory request = RevocationRequest({schema: invalidSchemaId, data: data});

        vm.prank(developer);
        vm.expectRevert(InvalidAttestationSchema.selector);
        attestationRegistry.revoke(request);
    }

    function test_revertWhen_revokeInvalidRevoker() external {
        MockPlugin plugin = new MockPlugin(_randomAddress());
        (bytes32 schemaId, bytes32 attestationId) = registerApp(plugin, true);

        RevocationRequestData memory data = RevocationRequestData({uid: attestationId, value: 0});

        RevocationRequest memory request = RevocationRequest({schema: schemaId, data: data});

        vm.prank(_randomAddress());
        vm.expectRevert(InvalidRevoker.selector);
        attestationRegistry.revoke(request);
    }

    function test_revertWhen_revokeIrrevocable() external {
        MockPlugin plugin = new MockPlugin(_randomAddress());
        (bytes32 schemaId, bytes32 attestationId) = registerApp(plugin, false);

        RevocationRequestData memory data = RevocationRequestData({uid: attestationId, value: 0});

        RevocationRequest memory request = RevocationRequest({schema: schemaId, data: data});

        vm.prank(developer);
        vm.expectRevert(Irrevocable.selector);
        attestationRegistry.revoke(request);
    }

    function test_revertWhen_revokeAlreadyRevoked() external {
        MockPlugin plugin = new MockPlugin(_randomAddress());
        (bytes32 schemaId, bytes32 attestationId) = registerApp(plugin, true);

        RevocationRequestData memory data = RevocationRequestData({uid: attestationId, value: 0});

        RevocationRequest memory request = RevocationRequest({schema: schemaId, data: data});

        vm.prank(developer);
        attestationRegistry.revoke(request);

        vm.prank(developer);
        vm.expectRevert(InvalidRevocation.selector);
        attestationRegistry.revoke(request);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Charging                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_resolverIsPayable() external {
        MockPayableResolver chargingResolver = new MockPayableResolver(diamond);

        bytes32 schemaId = registerSchema({
            testSchema: "test",
            resolver: address(chargingResolver),
            revocable: true
        });

        AttestationRequestData memory data = AttestationRequestData({
            recipient: address(0),
            expirationTime: 0,
            revocable: true,
            refUID: EMPTY_UID,
            data: "",
            value: 1 ether
        });

        AttestationRequest memory request = AttestationRequest({schema: schemaId, data: data});

        vm.deal(developer, 2 ether);

        // we send 2 eth expecting a refund of 1 ether
        vm.prank(developer);
        attestationRegistry.attest{value: 2 ether}(request);

        assertEq(address(chargingResolver).balance, 1 ether);
        assertEq(developer.balance, 1 ether);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Helpers                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function registerApp(
        IERC6900Module plugin,
        bool revocable
    ) internal returns (bytes32 schemaId, bytes32 attestationId) {
        schemaId = registerSchema(
            "address plugin,uint8 pluginType,string moduleId,bool audited",
            address(pluginValidator),
            true
        );
        bytes memory encodedData = abi.encode(
            address(plugin),
            PluginType.Execution,
            plugin.moduleId(),
            true
        );

        AttestationRequestData memory data = AttestationRequestData({
            recipient: address(plugin), // The plugin contract will receive the attestation
            expirationTime: 0, // No expiration
            revocable: revocable, // Can it be revoked by the developer
            refUID: EMPTY_UID, // No reference attestation
            data: encodedData, // The encoded plugin data
            value: 0 // No ETH value sent
        });

        AttestationRequest memory request = AttestationRequest({schema: schemaId, data: data});

        vm.prank(developer);
        attestationId = attestationRegistry.attest(request);
    }

    function registerSchema(
        string memory testSchema,
        address resolver,
        bool revocable
    ) internal returns (bytes32) {
        SchemaRecord memory schema = SchemaRecord({
            uid: EMPTY_UID,
            resolver: ISchemaResolver(resolver),
            revocable: revocable,
            schema: testSchema
        });
        schema.uid = getUID(schema);

        vm.prank(deployer);
        vm.expectEmit(diamond);
        emit ISchemaRegistry.Registered(schema.uid, deployer, schema);
        return
            schemaRegistry.register({
                schema: testSchema,
                resolver: ISchemaResolver(resolver),
                revocable: revocable
            });
    }

    function getUID(SchemaRecord memory schema) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(schema.schema, schema.resolver, schema.revocable));
    }
}
