// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {BaseSetup} from "test/spaces/BaseSetup.sol";

//interfaces
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";
import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {IAppRegistryBase} from "src/apps/facets/registry/IAppRegistry.sol";
import {IAttestationRegistryBase} from "src/apps/facets/attest/IAttestationRegistry.sol";

//libraries
import {Attestation} from "@ethereum-attestation-service/eas-contracts/Common.sol";

// types
import {ExecutionManifest} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";

//contracts
import {AppRegistryFacet} from "src/apps/facets/registry/AppRegistryFacet.sol";
import {MockPlugin} from "test/mocks/MockPlugin.sol";

contract AppRegistryTest is BaseSetup, IAppRegistryBase, IAttestationRegistryBase {
    address internal developer;

    AppRegistryFacet internal facet;

    uint256 private DEFAULT_INSTALL_PRICE = 0.001 ether;
    uint64 private DEFAULT_ACCESS_DURATION = 365 days;

    function setUp() public override {
        super.setUp();
        facet = AppRegistryFacet(appRegistry);
    }

    // ==================== SCHEMA TESTS ====================

    function test_getAppSchema() external view {
        string memory schema = facet.getAppSchema();
        assertEq(
            schema,
            "address app, address owner, address[] clients, bytes32[] permissions, ExecutionManifest manifest"
        );
    }

    // ==================== MODULE REGISTRATION TESTS ====================

    function test_registerApp() external {
        address owner = _randomAddress();

        vm.prank(owner);
        address app = address(new MockPlugin(owner));

        address[] memory clients = new address[](1);
        clients[0] = _randomAddress();

        vm.prank(owner);
        bytes32 uid = facet.registerApp(app, clients);
        assertEq(uid, facet.getLatestAppId(app));
    }

    function test_revertWhen_registerApp_EmptyApp() external {
        address owner = _randomAddress();

        address[] memory clients = new address[](1);
        clients[0] = _randomAddress();

        // App address cannot be zero
        vm.prank(owner);
        vm.expectRevert(InvalidAddressInput.selector);
        facet.registerApp(address(0), clients);
    }

    function test_revertWhen_registerApp_EmptyClients() external {
        address owner = _randomAddress();
        address app = address(new MockPlugin(owner));

        address[] memory clients = new address[](0);

        // Client list cannot be empty
        vm.prank(owner);
        vm.expectRevert(InvalidArrayInput.selector);
        facet.registerApp(app, clients);
    }

    // ==================== MODULE INFORMATION TESTS ====================

    function test_getAppClients() external {
        address owner = _randomAddress();

        vm.prank(owner);
        address app = address(new MockPlugin(owner));

        address[] memory clients = new address[](2);
        clients[0] = _randomAddress();
        clients[1] = _randomAddress();

        vm.prank(owner);
        bytes32 appId = facet.registerApp(app, clients);

        Attestation memory att = facet.getAttestation(appId);
        (, , address[] memory retrievedClients, , ) = abi.decode(
            att.data,
            (address, address, address[], bytes32[], ExecutionManifest)
        );
        assertEq(retrievedClients.length, clients.length);
        assertEq(retrievedClients[0], clients[0]);
        assertEq(retrievedClients[1], clients[1]);
    }

    // ==================== MODULE REVOCATION TESTS ====================

    function test_removeApp() external {
        address owner = _randomAddress();

        vm.prank(owner);
        address app = address(new MockPlugin(owner));

        address[] memory clients = new address[](1);
        clients[0] = _randomAddress();

        vm.prank(owner);
        bytes32 appId = facet.registerApp(app, clients);

        vm.prank(owner);
        bytes32 revokedUid = facet.removeApp(appId);

        assertEq(revokedUid, appId);
    }

    function test_removeApp_onlyOwner() external {
        address owner = _randomAddress();

        vm.prank(owner);
        address app = address(new MockPlugin(owner));
        address notOwner = _randomAddress();

        address[] memory clients = new address[](1);
        clients[0] = _randomAddress();

        vm.prank(owner);
        bytes32 appId = facet.registerApp(app, clients);

        vm.prank(notOwner);
        vm.expectRevert(InvalidRevoker.selector);
        facet.removeApp(appId);
    }

    function test_revertWhen_removeApp_AppNotRegistered() external {
        bytes32 appId = bytes32(0);
        vm.expectRevert(InvalidAppId.selector);
        facet.removeApp(appId);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      SIMPLE APP TESTS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_createSimpleApp() external {
        address owner = _randomAddress();

        address[] memory clients = new address[](1);
        clients[0] = _randomAddress();

        bytes32[] memory permissions = new bytes32[](1);
        permissions[0] = bytes32("Read");

        uint256 installPrice = 0.001 ether;
        uint64 accessDuration = 365 days;

        AppParams memory appData = AppParams({
            name: "simple.app",
            permissions: permissions,
            clients: clients,
            installPrice: installPrice,
            accessDuration: accessDuration
        });

        vm.prank(owner);
        (address app, bytes32 appId) = facet.createApp(appData);

        Attestation memory att = facet.getAttestation(appId);
        (address module, , , , ) = abi.decode(
            att.data,
            (address, address, address[], bytes32[], ExecutionManifest)
        );

        assertEq(appId, facet.getLatestAppId(app));
        assertEq(module, app);
    }

    function test_revertWhen_createApp_EmptyName() external {
        address owner = _randomAddress();
        address[] memory clients = new address[](1);
        clients[0] = _randomAddress();
        bytes32[] memory permissions = new bytes32[](1);
        permissions[0] = bytes32("Read");
        AppParams memory appData = AppParams({
            name: "",
            permissions: permissions,
            clients: clients,
            installPrice: DEFAULT_INSTALL_PRICE,
            accessDuration: DEFAULT_ACCESS_DURATION
        });
        vm.prank(owner);
        vm.expectRevert(InvalidAppName.selector);
        facet.createApp(appData);
    }

    function test_revertWhen_createApp_EmptyPermissions() external {
        address owner = _randomAddress();
        address[] memory clients = new address[](1);
        clients[0] = _randomAddress();
        bytes32[] memory permissions = new bytes32[](0);
        AppParams memory appData = AppParams({
            name: "simple.app",
            permissions: permissions,
            clients: clients,
            installPrice: DEFAULT_INSTALL_PRICE,
            accessDuration: DEFAULT_ACCESS_DURATION
        });
        vm.prank(owner);
        vm.expectRevert(InvalidArrayInput.selector);
        facet.createApp(appData);
    }

    function test_revertWhen_createApp_EmptyClients() external {
        address owner = _randomAddress();
        address[] memory clients = new address[](0);
        bytes32[] memory permissions = new bytes32[](1);
        permissions[0] = bytes32("Read");
        AppParams memory appData = AppParams({
            name: "simple.app",
            permissions: permissions,
            clients: clients,
            installPrice: DEFAULT_INSTALL_PRICE,
            accessDuration: DEFAULT_ACCESS_DURATION
        });
        vm.prank(owner);
        vm.expectRevert(InvalidArrayInput.selector);
        facet.createApp(appData);
    }

    function test_revertWhen_createApp_ZeroAddressClient() external {
        address owner = _randomAddress();
        address[] memory clients = new address[](2);
        clients[0] = _randomAddress();
        clients[1] = address(0);
        bytes32[] memory permissions = new bytes32[](1);
        permissions[0] = bytes32("Read");
        AppParams memory appData = AppParams({
            name: "simple.app",
            permissions: permissions,
            clients: clients,
            installPrice: DEFAULT_INSTALL_PRICE,
            accessDuration: DEFAULT_ACCESS_DURATION
        });
        vm.prank(owner);
        vm.expectRevert(InvalidAddressInput.selector);
        facet.createApp(appData);
    }

    // ==================== ADMIN FUNCTIONS TESTS ====================

    function test_adminRegisterAppSchema() external {
        string memory newSchema = "address app, bytes32 newSchema";

        vm.startPrank(deployer);
        bytes32 newSchemaId = facet.adminRegisterAppSchema(
            newSchema,
            ISchemaResolver(address(0)),
            true
        );
        vm.stopPrank();

        assertEq(facet.getAppSchemaId(), newSchemaId);
    }

    function test_adminBanApp() external {
        address owner = _randomAddress();

        vm.prank(owner);
        address app = address(new MockPlugin(owner));

        address[] memory clients = new address[](1);
        clients[0] = _randomAddress();

        vm.prank(owner);
        bytes32 appId = facet.registerApp(app, clients);

        vm.prank(deployer);
        bytes32 bannedUid = facet.adminBanApp(app);

        assertEq(bannedUid, appId);
        assertEq(facet.getLatestAppId(app), bytes32(0));
    }

    function test_adminBanApp_onlyOwner() external {
        address notOwner = _randomAddress();
        address app = address(new MockPlugin(_randomAddress()));

        vm.prank(notOwner);
        vm.expectRevert(abi.encodeWithSelector(IOwnableBase.Ownable__NotOwner.selector, notOwner));
        facet.adminBanApp(app);
    }

    function test_revertWhen_adminBanApp_AppNotRegistered() external {
        address app = address(new MockPlugin(_randomAddress()));

        // Even the admin cannot ban a app that doesn't exist
        vm.prank(deployer);
        vm.expectRevert(AppNotRegistered.selector);
        facet.adminBanApp(app);
    }
}
