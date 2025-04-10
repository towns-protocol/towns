// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {BaseSetup} from "test/spaces/BaseSetup.sol";

//interfaces
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";

//libraries
import {Attestation} from "@ethereum-attestation-service/eas-contracts/Common.sol";
import {AttestationLib} from "src/attest/libraries/AttestationLib.sol";
import {ModuleLib} from "src/attest/libraries/ModuleLib.sol";

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
        bytes32 schemaId = schemaRegistry.register(
            MODULE_REGISTRY_SCHEMA,
            ISchemaResolver(address(0)),
            true
        );
        moduleRegistry.adminRegisterModuleSchema(schemaId);
        vm.stopPrank();
    }

    function test_registerModule() external {
        address module = address(new MockPlugin());
        address owner = _randomAddress();

        address[] memory clients = new address[](1);
        clients[0] = _randomAddress();
        bytes32[] memory permissions = new bytes32[](1);
        permissions[0] = keccak256("Read");
        ExecutionManifest memory manifest;

        bytes32 uid = moduleRegistry.registerModule(module, owner, clients, permissions, manifest);
        assertEq(uid, moduleRegistry.getModuleVersion(module));
    }

    function registerModule(
        address module,
        address owner,
        address[] calldata clients,
        bytes32[] calldata permissions,
        ExecutionManifest calldata manifest
    ) external {
        Attestation memory att;
        att.schema = activeSchemaId;
        att.time = uint64(block.timestamp);
        att.recipient = address(module);
        att.revocable = true;
        att.attester = owner;
        att.data = abi.encode(module, owner, clients, permissions, manifest);

        bytes32 uid = AttestationLib._hashAttestation(att, 0);

        vm.prank(owner);
        vm.expectEmit(appRegistry);
        emit ModuleLib.ModuleRegistered(module, uid);
        moduleRegistry.registerModule(module, owner, clients, permissions, manifest);
    }
}
