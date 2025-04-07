// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";

//interfaces
import {ISchemaResolver} from
    "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";

//libraries
import {Attestation} from "@ethereum-attestation-service/eas-contracts/Common.sol";
import {AttestationLib} from "contracts/src/attest/libraries/AttestationLib.sol";
import {ModuleLib} from "contracts/src/attest/libraries/ModuleLib.sol";

// types
import {ExecutionManifest} from
    "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";

//contracts
import {ModuleRegistry} from "contracts/src/attest/ModuleRegistry.sol";
import {SchemaRegistry} from "contracts/src/attest/SchemaRegistry.sol";
import {MockPlugin} from "contracts/test/mocks/MockPlugin.sol";

contract ModuleRegistryTest is BaseSetup {
    bytes32 internal activeSchemaId;
    address internal developer;

    SchemaRegistry internal schemaRegistry;
    ModuleRegistry internal moduleRegistry;

    string internal MODULE_REGISTRY_SCHEMA =
        "address module, address client, address owner, bytes32[] permissions";

    function setUp() public override {
        super.setUp();
        schemaRegistry = SchemaRegistry(appRegistry);
        moduleRegistry = ModuleRegistry(appRegistry);

        vm.prank(deployer);
        activeSchemaId = moduleRegistry.registerModuleSchema(
            MODULE_REGISTRY_SCHEMA, ISchemaResolver(address(0)), true
        );
    }

    function test_registerModule() external {
        address module = address(new MockPlugin());
        address owner = _randomAddress();
        address client = _randomAddress();
        bytes32[] memory permissions = new bytes32[](1);
        permissions[0] = keccak256("Read");
        ExecutionManifest memory manifest;

        bytes32 uid = moduleRegistry.registerModule(module, client, owner, permissions, manifest);
        assertEq(uid, moduleRegistry.getModuleVersion(module));
    }

    function registerModule(
        address module,
        address client,
        address owner,
        bytes32[] calldata permissions,
        ExecutionManifest calldata manifest
    )
        external
    {
        Attestation memory att;
        att.schema = activeSchemaId;
        att.time = uint64(block.timestamp);
        att.recipient = address(module);
        att.revocable = true;
        att.attester = owner;
        att.data = abi.encode(module, client, owner, permissions, manifest);

        bytes32 uid = AttestationLib._hashAttestation(att, 0);

        vm.prank(owner);
        vm.expectEmit(appRegistry);
        emit ModuleLib.ModuleRegistered(module, uid);
        moduleRegistry.registerModule(module, client, owner, permissions, manifest);
    }
}
