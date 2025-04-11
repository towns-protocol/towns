// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {BaseSetup} from "test/spaces/BaseSetup.sol";

//interfaces
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";
import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";

//libraries
import {Attestation} from "@ethereum-attestation-service/eas-contracts/Common.sol";
import {AttestationLib} from "src/attest/libraries/AttestationLib.sol";
import {ModuleRegistryLib} from "src/attest/libraries/ModuleRegistryLib.sol";

// types
import {ExecutionManifest} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";

//contracts
import {ModuleRegistry} from "src/attest/ModuleRegistry.sol";
import {SchemaRegistry} from "src/attest/SchemaRegistry.sol";
import {MockPlugin} from "test/mocks/MockPlugin.sol";

contract ModuleRegistryTest is BaseSetup {
    bytes32 internal activeSchemaId;
    address internal developer;

    SchemaRegistry internal schemaRegistry;
    ModuleRegistry internal moduleRegistry;

    string internal MODULE_REGISTRY_SCHEMA =
        "address module, address owner, address[] clients, bytes32[] permissions, ExecutionManifest manifest";

    function setUp() public override {
        super.setUp();
        schemaRegistry = SchemaRegistry(appRegistry);
        moduleRegistry = ModuleRegistry(appRegistry);

        vm.startPrank(deployer);
        activeSchemaId = schemaRegistry.register(
            MODULE_REGISTRY_SCHEMA,
            ISchemaResolver(address(0)),
            true
        );
        moduleRegistry.adminRegisterModuleSchema(activeSchemaId);
        vm.stopPrank();
    }

    // ==================== SCHEMA TESTS ====================

    function test_getModuleSchema() external view {
        string memory schema = moduleRegistry.getModuleSchema();
        assertEq(
            schema,
            "address module, address client, address owner, bytes32[] permissions, ExecutionManifest manifest"
        );
    }

    function test_getModuleSchemaId() external view {
        bytes32 schemaId = moduleRegistry.getModuleSchemaId();
        assertEq(schemaId, activeSchemaId);
    }

    // ==================== MODULE REGISTRATION TESTS ====================

    function test_registerModule() external {
        address module = address(new MockPlugin());
        address owner = _randomAddress();

        address[] memory clients = new address[](1);
        clients[0] = _randomAddress();

        vm.prank(owner);
        bytes32 uid = moduleRegistry.registerModule(module, owner, clients);
        assertEq(uid, moduleRegistry.getModuleVersion(module));
    }

    function test_revertWhen_registerModule_ModuleAlreadyRegistered() external {
        address module = address(new MockPlugin());
        address owner = _randomAddress();

        address[] memory clients = new address[](1);
        clients[0] = _randomAddress();
        bytes32[] memory permissions = new bytes32[](1);
        permissions[0] = keccak256("Read");

        // First registration works
        vm.prank(owner);
        moduleRegistry.registerModule(module, owner, clients);

        // Second registration should revert
        vm.prank(owner);
        vm.expectRevert(ModuleRegistryLib.ModuleAlreadyRegistered.selector);
        moduleRegistry.registerModule(module, owner, clients);
    }

    function test_revertWhen_registerModule_EmptyModule() external {
        address owner = _randomAddress();

        address[] memory clients = new address[](1);
        clients[0] = _randomAddress();

        // Module address cannot be zero
        vm.expectRevert(ModuleRegistryLib.InvalidAddressInput.selector);
        moduleRegistry.registerModule(address(0), owner, clients);
    }

    function test_revertWhen_registerModule_EmptyOwner() external {
        address module = address(new MockPlugin());

        address[] memory clients = new address[](1);
        clients[0] = _randomAddress();

        // Owner address cannot be zero
        vm.expectRevert(ModuleRegistryLib.InvalidAddressInput.selector);
        moduleRegistry.registerModule(module, address(0), clients);
    }

    function test_revertWhen_registerModule_EmptyClients() external {
        address module = address(new MockPlugin());
        address owner = _randomAddress();

        address[] memory clients = new address[](0);

        // Client list cannot be empty
        vm.expectRevert(ModuleRegistryLib.InvalidArrayInput.selector);
        moduleRegistry.registerModule(module, owner, clients);
    }

    // ==================== MODULE INFORMATION TESTS ====================

    function test_getModuleClients() external {
        address module = address(new MockPlugin());
        address owner = _randomAddress();

        address[] memory clients = new address[](2);
        clients[0] = _randomAddress();
        clients[1] = _randomAddress();

        vm.prank(owner);
        moduleRegistry.registerModule(module, owner, clients);

        Attestation memory att = moduleRegistry.getModule(module);
        (, address[] memory retrievedClients, , , ) = abi.decode(
            att.data,
            (address, address[], address, bytes32[], ExecutionManifest)
        );
        assertEq(retrievedClients.length, clients.length);
        assertEq(retrievedClients[0], clients[0]);
        assertEq(retrievedClients[1], clients[1]);
    }

    // ==================== MODULE PERMISSIONS TESTS ====================

    function test_updateModulePermissions() external {
        address module = address(new MockPlugin());
        address owner = _randomAddress();

        address[] memory clients = new address[](1);
        clients[0] = _randomAddress();

        vm.prank(owner);
        moduleRegistry.registerModule(module, owner, clients);

        bytes32[] memory newPermissions = new bytes32[](2);
        newPermissions[0] = keccak256("Read");
        newPermissions[1] = keccak256("Write");

        vm.prank(owner);
        bytes32 newUid = moduleRegistry.updateModulePermissions(module, newPermissions);

        assertEq(newUid, moduleRegistry.getModuleVersion(module));
        assertTrue(newUid != bytes32(0));
    }

    function test_updateModulePermissions_onlyOwner() external {
        address module = address(new MockPlugin());
        address owner = _randomAddress();
        address notOwner = _randomAddress();

        address[] memory clients = new address[](1);
        clients[0] = _randomAddress();

        vm.prank(owner);
        moduleRegistry.registerModule(module, owner, clients);

        bytes32[] memory newPermissions = new bytes32[](2);
        newPermissions[0] = keccak256("Read");
        newPermissions[1] = keccak256("Write");

        vm.prank(notOwner);
        vm.expectRevert(ModuleRegistryLib.NotModuleOwner.selector);
        moduleRegistry.updateModulePermissions(module, newPermissions);
    }

    function test_revertWhen_updateModulePermissions_ModuleNotRegistered() external {
        address module = address(new MockPlugin());
        address owner = _randomAddress();

        bytes32[] memory newPermissions = new bytes32[](2);
        newPermissions[0] = keccak256("Read");
        newPermissions[1] = keccak256("Write");

        vm.prank(owner);
        vm.expectRevert(ModuleRegistryLib.ModuleNotRegistered.selector);
        moduleRegistry.updateModulePermissions(module, newPermissions);
    }

    // ==================== MODULE REVOCATION TESTS ====================

    function test_revokeModule() external {
        address module = address(new MockPlugin());
        address owner = _randomAddress();

        address[] memory clients = new address[](1);
        clients[0] = _randomAddress();

        vm.prank(owner);
        moduleRegistry.registerModule(module, owner, clients);

        bytes32 previousUid = moduleRegistry.getModuleVersion(module);
        assertTrue(previousUid != bytes32(0));

        vm.prank(owner);
        bytes32 revokedUid = moduleRegistry.revokeModule(module);

        assertEq(revokedUid, previousUid);
        assertEq(moduleRegistry.getModuleVersion(module), bytes32(0));
    }

    function test_revokeModule_onlyOwner() external {
        address module = address(new MockPlugin());
        address owner = _randomAddress();
        address notOwner = _randomAddress();

        address[] memory clients = new address[](1);
        clients[0] = _randomAddress();

        vm.prank(owner);
        moduleRegistry.registerModule(module, owner, clients);

        vm.prank(notOwner);
        vm.expectRevert(AttestationLib.InvalidRevoker.selector);
        moduleRegistry.revokeModule(module);
    }

    function test_revertWhen_revokeModule_ModuleNotRegistered() external {
        address module = address(new MockPlugin());
        address owner = _randomAddress();

        vm.prank(owner);
        vm.expectRevert(ModuleRegistryLib.ModuleNotRegistered.selector);
        moduleRegistry.revokeModule(module);
    }

    // ==================== ADMIN FUNCTIONS TESTS ====================

    function test_adminRegisterModuleSchema() external {
        string memory newSchema = "address module, bytes32 newSchema";
        vm.startPrank(deployer);
        bytes32 newSchemaId = schemaRegistry.register(newSchema, ISchemaResolver(address(0)), true);

        moduleRegistry.adminRegisterModuleSchema(newSchemaId);
        vm.stopPrank();

        assertEq(moduleRegistry.getModuleSchemaId(), newSchemaId);
    }

    function test_adminRegisterModuleSchema_onlyOwner() external {
        address notOwner = _randomAddress();
        bytes32 fakeSchemaId = bytes32(uint256(1));

        vm.prank(notOwner);
        vm.expectRevert(abi.encodeWithSelector(IOwnableBase.Ownable__NotOwner.selector, notOwner));
        moduleRegistry.adminRegisterModuleSchema(fakeSchemaId);
    }

    function test_adminBanModule() external {
        address module = address(new MockPlugin());
        address owner = _randomAddress();

        address[] memory clients = new address[](1);
        clients[0] = _randomAddress();

        vm.prank(owner);
        moduleRegistry.registerModule(module, owner, clients);

        bytes32 previousUid = moduleRegistry.getModuleVersion(module);

        vm.prank(deployer);
        bytes32 bannedUid = moduleRegistry.adminBanModule(module);

        assertEq(bannedUid, previousUid);
        assertEq(moduleRegistry.getModuleVersion(module), bytes32(0));
    }

    function test_adminBanModule_onlyOwner() external {
        address module = address(new MockPlugin());
        address notOwner = _randomAddress();

        vm.prank(notOwner);
        vm.expectRevert(abi.encodeWithSelector(IOwnableBase.Ownable__NotOwner.selector, notOwner));
        moduleRegistry.adminBanModule(module);
    }

    function test_revertWhen_adminBanModule_ModuleNotRegistered() external {
        address module = address(new MockPlugin());

        // Even the admin cannot ban a module that doesn't exist
        vm.prank(deployer);
        vm.expectRevert(ModuleRegistryLib.ModuleNotRegistered.selector);
        moduleRegistry.adminBanModule(module);
    }
}
