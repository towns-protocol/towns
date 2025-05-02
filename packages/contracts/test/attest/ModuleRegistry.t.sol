// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {BaseSetup} from "test/spaces/BaseSetup.sol";

//interfaces
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";
import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";

//libraries
import {Attestation} from "@ethereum-attestation-service/eas-contracts/Common.sol";
import {AttestationLib} from "src/modules/libraries/AttestationLib.sol";
import {ModuleRegistryLib} from "src/modules/libraries/ModuleRegistryLib.sol";

// types
import {ExecutionManifest} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";

//contracts
import {ModuleRegistry} from "src/modules/ModuleRegistry.sol";
import {SchemaRegistry} from "src/modules/SchemaRegistry.sol";
import {MockPlugin} from "test/mocks/MockPlugin.sol";

contract ModuleRegistryTest is BaseSetup {
    address internal developer;

    ModuleRegistry internal moduleRegistry;

    function setUp() public override {
        super.setUp();
        moduleRegistry = ModuleRegistry(appRegistry);
    }

    // ==================== SCHEMA TESTS ====================

    function test_getModuleSchema() external view {
        string memory schema = moduleRegistry.getModuleSchema();
        assertEq(
            schema,
            "address module, address owner, address[] clients, bytes32[] permissions, ExecutionManifest manifest"
        );
    }

    // ==================== MODULE REGISTRATION TESTS ====================

    function test_registerModule() external {
        address owner = _randomAddress();

        vm.prank(owner);
        address module = address(new MockPlugin(owner));

        address[] memory clients = new address[](1);
        clients[0] = _randomAddress();

        vm.prank(owner);
        bytes32 uid = moduleRegistry.registerModule(module, clients);
        assertEq(uid, moduleRegistry.getLatestModuleId(module));
    }

    function test_revertWhen_registerModule_EmptyModule() external {
        address owner = _randomAddress();

        address[] memory clients = new address[](1);
        clients[0] = _randomAddress();

        // Module address cannot be zero
        vm.prank(owner);
        vm.expectRevert(ModuleRegistryLib.InvalidAddressInput.selector);
        moduleRegistry.registerModule(address(0), clients);
    }

    function test_revertWhen_registerModule_EmptyClients() external {
        address owner = _randomAddress();
        address module = address(new MockPlugin(owner));

        address[] memory clients = new address[](0);

        // Client list cannot be empty
        vm.prank(owner);
        vm.expectRevert(ModuleRegistryLib.InvalidArrayInput.selector);
        moduleRegistry.registerModule(module, clients);
    }

    // ==================== MODULE INFORMATION TESTS ====================

    function test_getModuleClients() external {
        address owner = _randomAddress();

        vm.prank(owner);
        address module = address(new MockPlugin(owner));

        address[] memory clients = new address[](2);
        clients[0] = _randomAddress();
        clients[1] = _randomAddress();

        vm.prank(owner);
        bytes32 moduleId = moduleRegistry.registerModule(module, clients);

        Attestation memory att = moduleRegistry.getModuleById(moduleId);
        (, , address[] memory retrievedClients, , ) = abi.decode(
            att.data,
            (address, address, address[], bytes32[], ExecutionManifest)
        );
        assertEq(retrievedClients.length, clients.length);
        assertEq(retrievedClients[0], clients[0]);
        assertEq(retrievedClients[1], clients[1]);
    }

    // ==================== MODULE PERMISSIONS TESTS ====================

    function test_updateModulePermissions() external {
        address owner = _randomAddress();
        address module = address(new MockPlugin(owner));

        address[] memory clients = new address[](1);
        clients[0] = _randomAddress();

        vm.prank(owner);
        bytes32 moduleId = moduleRegistry.registerModule(module, clients);

        bytes32[] memory newPermissions = new bytes32[](2);
        newPermissions[0] = keccak256("Read");
        newPermissions[1] = keccak256("Write");

        vm.prank(owner);
        bytes32 newUid = moduleRegistry.updateModulePermissions(moduleId, newPermissions);

        assertEq(newUid, moduleRegistry.getLatestModuleId(module));
        assertTrue(newUid != bytes32(0));
    }

    function test_updateModulePermissions_onlyOwner() external {
        address owner = _randomAddress();
        address module = address(new MockPlugin(owner));
        address notOwner = _randomAddress();

        address[] memory clients = new address[](1);
        clients[0] = _randomAddress();

        vm.prank(owner);
        bytes32 moduleId = moduleRegistry.registerModule(module, clients);

        bytes32[] memory newPermissions = new bytes32[](2);
        newPermissions[0] = keccak256("Read");
        newPermissions[1] = keccak256("Write");

        vm.prank(notOwner);
        vm.expectRevert(ModuleRegistryLib.NotModuleOwner.selector);
        moduleRegistry.updateModulePermissions(moduleId, newPermissions);
    }

    function test_revertWhen_updateModulePermissions_ModuleNotRegistered() external {
        address owner = _randomAddress();
        bytes32 moduleId = _randomBytes32();
        bytes32[] memory newPermissions = new bytes32[](2);
        newPermissions[0] = keccak256("Read");
        newPermissions[1] = keccak256("Write");

        vm.prank(owner);
        vm.expectRevert(ModuleRegistryLib.ModuleNotRegistered.selector);
        moduleRegistry.updateModulePermissions(moduleId, newPermissions);
    }

    // ==================== MODULE REVOCATION TESTS ====================

    function test_removeModule() external {
        address owner = _randomAddress();

        vm.prank(owner);
        address module = address(new MockPlugin(owner));

        address[] memory clients = new address[](1);
        clients[0] = _randomAddress();

        vm.prank(owner);
        bytes32 moduleId = moduleRegistry.registerModule(module, clients);

        vm.prank(owner);
        bytes32 revokedUid = moduleRegistry.removeModule(moduleId);

        assertEq(revokedUid, moduleId);
        assertEq(moduleRegistry.getLatestModuleId(module), bytes32(0));
    }

    function test_removeModule_onlyOwner() external {
        address owner = _randomAddress();

        vm.prank(owner);
        address module = address(new MockPlugin(owner));
        address notOwner = _randomAddress();

        address[] memory clients = new address[](1);
        clients[0] = _randomAddress();

        vm.prank(owner);
        bytes32 moduleId = moduleRegistry.registerModule(module, clients);

        vm.prank(notOwner);
        vm.expectRevert(AttestationLib.InvalidRevoker.selector);
        moduleRegistry.removeModule(moduleId);
    }

    function test_revertWhen_removeModule_ModuleNotRegistered() external {
        bytes32 moduleId = bytes32(0);
        vm.expectRevert(ModuleRegistryLib.InvalidModuleId.selector);
        moduleRegistry.removeModule(moduleId);
    }

    // ==================== ADMIN FUNCTIONS TESTS ====================

    function test_adminRegisterModuleSchema() external {
        string memory newSchema = "address module, bytes32 newSchema";

        vm.startPrank(deployer);
        bytes32 newSchemaId = moduleRegistry.adminRegisterModuleSchema(
            newSchema,
            ISchemaResolver(address(0)),
            true
        );
        vm.stopPrank();

        assertEq(moduleRegistry.getModuleSchemaId(), newSchemaId);
    }

    function test_adminBanModule() external {
        address owner = _randomAddress();

        vm.prank(owner);
        address module = address(new MockPlugin(owner));

        address[] memory clients = new address[](1);
        clients[0] = _randomAddress();

        vm.prank(owner);
        bytes32 moduleId = moduleRegistry.registerModule(module, clients);

        vm.prank(deployer);
        bytes32 bannedUid = moduleRegistry.adminBanModule(module);

        assertEq(bannedUid, moduleId);
        assertEq(moduleRegistry.getLatestModuleId(module), bytes32(0));
    }

    function test_adminBanModule_onlyOwner() external {
        address notOwner = _randomAddress();
        address module = address(new MockPlugin(_randomAddress()));

        vm.prank(notOwner);
        vm.expectRevert(abi.encodeWithSelector(IOwnableBase.Ownable__NotOwner.selector, notOwner));
        moduleRegistry.adminBanModule(module);
    }

    function test_revertWhen_adminBanModule_ModuleNotRegistered() external {
        address module = address(new MockPlugin(_randomAddress()));

        // Even the admin cannot ban a module that doesn't exist
        vm.prank(deployer);
        vm.expectRevert(ModuleRegistryLib.ModuleNotRegistered.selector);
        moduleRegistry.adminBanModule(module);
    }
}
