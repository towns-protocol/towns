// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISchemaResolver} from "contracts/src/attest/interfaces/ISchemaResolver.sol";

// libraries
import {DataTypes} from "contracts/src/attest/types/DataTypes.sol";

// contracts
import {AttestationRegistry} from "contracts/src/attest/AttestationRegistry.sol";
import {SchemaRegistry} from "contracts/src/attest/SchemaRegistry.sol";

import {TrustedAttesterResolver} from
    "contracts/src/attest/resolvers/trusted/TrustedAttesterResolver.sol";
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";

// mocks
import {MockPlugin} from "contracts/test/mocks/MockPlugin.sol";

contract TrustedResolverTest is BaseSetup {
    SchemaRegistry internal schemaRegistry;
    AttestationRegistry internal attestationRegistry;
    TrustedAttesterResolver internal trustedResolver;
    MockPlugin internal app;

    address internal developer;
    address internal user;

    function setUp() public override {
        super.setUp();
        schemaRegistry = SchemaRegistry(appRegistry);
        attestationRegistry = AttestationRegistry(appRegistry);
        trustedResolver = new TrustedAttesterResolver();
        trustedResolver.__TrustedAttesterResolver_init(appRegistry);
        app = new MockPlugin();
        developer = makeAddr("developer");
        user = makeAddr("user");
    }

    function test_onAttest() public {
        (bytes32 schemaId, bytes32 attestationId) = registerApp();
        DataTypes.Attestation memory attestation =
            trustedResolver.getAttestation(address(app), address(developer));
        assertEq(attestation.schema, schemaId);
        assertEq(attestation.uid, attestationId);
    }

    /// @notice Tests the trusted attesters functionality
    /// @dev This test verifies that:
    /// 1. A user can set trusted attesters
    /// 2. Installing a app without being registered should fail
    /// 3. After attestation, installing the app should succeed
    function test_trustAttesters() public {
        // Set up single trusted attester (the developer)
        address[] memory attesters = new address[](1);
        attesters[0] = developer;

        // User sets developer as trusted attester with threshold of 1
        // meaning that at least one attestation is required to install the app
        vm.prank(user);
        trustedResolver.trustAttesters(1, attesters);

        // Check should fail since app has no attestations yet
        vm.prank(user);
        vm.expectRevert(DataTypes.InsufficientAttestations.selector);
        trustedResolver.check(address(app));

        // Developer attests to the app
        registerApp();

        // Check should now succeed since app has attestation from trusted attester
        vm.prank(user);
        trustedResolver.check(address(app));
    }

    function registerApp() internal returns (bytes32 schemaId, bytes32 attestationId) {
        schemaId = registerSchema("testSchema", address(trustedResolver), true);

        DataTypes.AttestationRequestData memory data = DataTypes.AttestationRequestData({
            recipient: address(app),
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
