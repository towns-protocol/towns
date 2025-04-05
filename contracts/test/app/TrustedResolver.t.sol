// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISchemaResolver} from "contracts/src/app/interfaces/ISchemaResolver.sol";

// libraries
import {DataTypes} from "contracts/src/app/types/DataTypes.sol";

// contracts
import {AttestationRegistry} from "contracts/src/app/AttestationRegistry.sol";
import {SchemaRegistry} from "contracts/src/app/SchemaRegistry.sol";

import {TrustedAttesterResolver} from
    "contracts/src/app/resolvers/trusted/TrustedAttesterResolver.sol";
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";

// mocks
import {MockPlugin} from "contracts/test/mocks/MockPlugin.sol";

contract TrustedResolverTest is BaseSetup {
    SchemaRegistry internal schemaRegistry;
    AttestationRegistry internal attestationRegistry;
    TrustedAttesterResolver internal trustedResolver;
    MockPlugin internal plugin;

    address internal developer;
    address internal user;

    function setUp() public override {
        super.setUp();
        schemaRegistry = SchemaRegistry(appRegistry);
        attestationRegistry = AttestationRegistry(appRegistry);
        trustedResolver = new TrustedAttesterResolver();
        trustedResolver.__TrustedAttesterResolver_init(appRegistry);
        plugin = new MockPlugin();
        developer = makeAddr("developer");
        user = makeAddr("user");
    }

    function test_onAttest() public {
        (bytes32 schemaId, bytes32 attestationId) = registerPlugin();
        DataTypes.Attestation memory attestation =
            trustedResolver.getAttestation(address(plugin), address(developer));

        assertEq(attestation.schema, schemaId);
        assertEq(attestation.uid, attestationId);
    }

    function test_trustAttesters() public {
        address[] memory attesters = new address[](1);
        attesters[0] = developer;

        vm.prank(user);
        trustedResolver.trustAttesters(1, attesters);

        vm.prank(user);
        vm.expectRevert(DataTypes.InsufficientAttestations.selector);
        trustedResolver.check(address(plugin));

        registerPlugin();

        vm.prank(user);
        trustedResolver.check(address(plugin));
    }

    function registerPlugin() internal returns (bytes32 schemaId, bytes32 attestationId) {
        schemaId = registerSchema("testSchema", address(trustedResolver), true);

        DataTypes.AttestationRequestData memory data = DataTypes.AttestationRequestData({
            recipient: address(plugin),
            expirationTime: 0,
            revocable: true,
            refUID: DataTypes.EMPTY_UID,
            data: "",
            value: 0
        });

        DataTypes.AttestationRequest memory request =
            DataTypes.AttestationRequest({schemaId: schemaId, data: data});

        vm.prank(developer);
        attestationId = attestationRegistry.attest(request);
        return (schemaId, attestationId);
    }

    function registerSchema(
        string memory testSchema,
        address resolver,
        bool revocable
    )
        internal
        returns (bytes32)
    {
        vm.prank(deployer);
        return schemaRegistry.register({
            schema: testSchema,
            resolver: ISchemaResolver(resolver),
            revocable: revocable
        });
    }
}
