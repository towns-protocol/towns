// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// utils
import {BaseSetup} from "test/spaces/BaseSetup.sol";

//interfaces
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";
import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {IAppRegistryBase} from "src/apps/facets/registry/IAppRegistry.sol";
import {IAttestationRegistryBase} from "src/apps/facets/attest/IAttestationRegistry.sol";
import {IERC6900Account} from "@erc6900/reference-implementation/interfaces/IERC6900Account.sol";
import {IPlatformRequirements} from "src/factory/facets/platform/requirements/IPlatformRequirements.sol";
import {ITownsApp} from "../../src/apps/ITownsApp.sol";

//libraries
import {Attestation} from "@ethereum-attestation-service/eas-contracts/Common.sol";
import {BasisPoints} from "src/utils/libraries/BasisPoints.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";

// types
import {ExecutionManifest} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";

//contracts
import {AppRegistryFacet} from "src/apps/facets/registry/AppRegistryFacet.sol";
import {MockPlugin} from "test/mocks/MockPlugin.sol";
import {AppAccount} from "src/spaces/facets/account/AppAccount.sol";
import {MockModule} from "test/mocks/MockModule.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract AppRegistryTest is BaseSetup, IAppRegistryBase, IAttestationRegistryBase {
    AppRegistryFacet internal registry;
    AppAccount internal appAccount;
    MockModule internal mockModule;

    uint256 private DEFAULT_INSTALL_PRICE = 0.001 ether;
    uint48 private DEFAULT_ACCESS_DURATION = 365 days;
    address private DEFAULT_CLIENT;
    address private DEFAULT_DEV;
    bytes32 private DEFAULT_APP_ID;

    function setUp() public override {
        super.setUp();
        registry = AppRegistryFacet(appRegistry);
        appAccount = AppAccount(everyoneSpace);

        DEFAULT_CLIENT = _randomAddress();
        DEFAULT_DEV = _randomAddress();

        MockModule mockModuleV1 = new MockModule();

        vm.prank(DEFAULT_DEV);
        mockModule = MockModule(
            address(
                new ERC1967Proxy(
                    address(mockModuleV1),
                    abi.encodeWithSelector(MockModule.initialize.selector, false, false, false, 0)
                )
            )
        );
    }

    modifier givenAppIsRegistered() {
        vm.prank(DEFAULT_DEV);
        DEFAULT_APP_ID = registry.registerApp(mockModule, DEFAULT_CLIENT);
        _;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       SCHEMA TESTS                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_getAppSchema() external view {
        string memory schema = registry.getAppSchema();
        assertEq(
            schema,
            "address app, address owner, address client, bytes32[] permissions, ExecutionManifest manifest, uint48 duration"
        );
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   MODULE REGISTRATION TESTS                */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_registerApp() external givenAppIsRegistered {
        assertEq(DEFAULT_APP_ID, registry.getLatestAppId(address(mockModule)));
        assertEq(address(mockModule), registry.getAppByClient(DEFAULT_CLIENT));
        assertEq(registry.getAppById(DEFAULT_APP_ID).duration, DEFAULT_ACCESS_DURATION);
    }

    function test_revertWhen_registerApp_EmptyApp() external {
        // App address cannot be zero
        vm.prank(DEFAULT_DEV);
        vm.expectRevert(InvalidAddressInput.selector);
        registry.registerApp(ITownsApp(address(0)), DEFAULT_CLIENT);
    }

    function test_revertWhen_registerApp_EmptyClient() external {
        address owner = _randomAddress();
        MockPlugin app = new MockPlugin(owner);

        // Client address cannot be zero
        vm.prank(owner);
        vm.expectRevert(InvalidAddressInput.selector);
        registry.registerApp(app, address(0));
    }

    function test_revertWhen_registerApp_ClientAlreadyRegistered() external givenAppIsRegistered {
        MockPlugin newApp = new MockPlugin(DEFAULT_DEV);

        vm.prank(DEFAULT_DEV);
        vm.expectRevert(ClientAlreadyRegistered.selector);
        registry.registerApp(newApp, DEFAULT_CLIENT);
    }

    function test_revertWhen_registerApp_InvalidDuration() external {
        vm.prank(DEFAULT_DEV);
        mockModule.setDuration(365 days + 1);

        vm.prank(DEFAULT_DEV);
        vm.expectRevert(InvalidDuration.selector);
        registry.registerApp(mockModule, DEFAULT_CLIENT);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   MODULE INFORMATION TESTS                 */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_getAppByClient() external givenAppIsRegistered {
        address app = registry.getAppByClient(DEFAULT_CLIENT);
        assertEq(app, address(mockModule));
    }

    function test_getAppByClient_returnsZeroForUnregisteredClient() external view {
        address unregisteredClient = _randomAddress();
        address app = registry.getAppByClient(unregisteredClient);
        assertEq(app, address(0));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   MODULE REVOCATION TESTS                  */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_removeApp() external givenAppIsRegistered {
        vm.prank(DEFAULT_DEV);
        registry.removeApp(DEFAULT_APP_ID);

        assertEq(registry.getAppByClient(DEFAULT_CLIENT), address(0));
    }

    function test_removeApp_onlyOwner() external givenAppIsRegistered {
        address notOwner = _randomAddress();

        vm.prank(notOwner);
        vm.expectRevert(InvalidRevoker.selector);
        registry.removeApp(DEFAULT_APP_ID);
    }

    function test_revertWhen_removeApp_AppNotRegistered() external {
        bytes32 appId = bytes32(0);
        vm.expectRevert(InvalidAppId.selector);
        registry.removeApp(appId);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      SIMPLE APP TESTS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_createSimpleApp() external {
        bytes32[] memory permissions = new bytes32[](1);
        permissions[0] = bytes32("Read");

        AppParams memory appData = AppParams({
            name: "simple.app",
            permissions: permissions,
            client: DEFAULT_CLIENT,
            installPrice: DEFAULT_INSTALL_PRICE,
            accessDuration: DEFAULT_ACCESS_DURATION
        });

        vm.prank(DEFAULT_DEV);
        (address app, bytes32 appId) = registry.createApp(appData);

        App memory appInfo = registry.getAppById(appId);
        address module = appInfo.module;

        assertEq(appId, registry.getLatestAppId(app));
        assertEq(module, app);
        assertEq(registry.getAppByClient(DEFAULT_CLIENT), app);
        assertEq(registry.getAppDuration(app), DEFAULT_ACCESS_DURATION);
    }

    function test_revertWhen_createApp_EmptyName() external {
        bytes32[] memory permissions = new bytes32[](1);
        permissions[0] = bytes32("Read");
        AppParams memory appData = AppParams({
            name: "",
            permissions: permissions,
            client: DEFAULT_CLIENT,
            installPrice: DEFAULT_INSTALL_PRICE,
            accessDuration: DEFAULT_ACCESS_DURATION
        });
        vm.prank(DEFAULT_DEV);
        vm.expectRevert(InvalidAppName.selector);
        registry.createApp(appData);
    }

    function test_revertWhen_createApp_EmptyPermissions() external {
        bytes32[] memory permissions = new bytes32[](0);
        AppParams memory appData = AppParams({
            name: "simple.app",
            permissions: permissions,
            client: DEFAULT_CLIENT,
            installPrice: DEFAULT_INSTALL_PRICE,
            accessDuration: DEFAULT_ACCESS_DURATION
        });
        vm.prank(DEFAULT_DEV);
        vm.expectRevert(InvalidArrayInput.selector);
        registry.createApp(appData);
    }

    function test_revertWhen_createApp_ZeroAddressClient() external {
        bytes32[] memory permissions = new bytes32[](1);
        permissions[0] = bytes32("Read");
        AppParams memory appData = AppParams({
            name: "simple.app",
            permissions: permissions,
            client: address(0),
            installPrice: DEFAULT_INSTALL_PRICE,
            accessDuration: DEFAULT_ACCESS_DURATION
        });
        vm.prank(DEFAULT_DEV);
        vm.expectRevert(InvalidAddressInput.selector);
        registry.createApp(appData);
    }

    function test_revertWhen_createApp_InvalidDuration() external {
        AppParams memory appData = AppParams({
            name: "simple.app",
            permissions: new bytes32[](1),
            client: DEFAULT_CLIENT,
            installPrice: DEFAULT_INSTALL_PRICE,
            accessDuration: 365 days + 1
        });
        vm.prank(DEFAULT_DEV);
        vm.expectRevert(InvalidDuration.selector);
        registry.createApp(appData);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      INSTALL APP TESTS                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_installApp() external givenAppIsRegistered {
        App memory appInfo = registry.getAppById(DEFAULT_APP_ID);

        uint256 totalRequired = registry.getAppPrice(address(mockModule));

        vm.deal(founder, totalRequired);

        vm.prank(founder);
        vm.expectEmit(address(appAccount));
        emit IERC6900Account.ExecutionInstalled(address(mockModule), appInfo.manifest);
        registry.installApp{value: totalRequired}(mockModule, appAccount, "");
    }

    function test_revertWhen_installApp_notAllowed() external givenAppIsRegistered {
        vm.prank(_randomAddress());
        vm.expectRevert(NotAllowed.selector);
        registry.installApp(mockModule, appAccount, "");
    }

    function test_revertWhen_installApp_appNotRegistered() external {
        vm.expectRevert(AppNotRegistered.selector);
        vm.prank(founder);
        registry.installApp(mockModule, appAccount, "");
    }

    function test_revertWhen_installApp_insufficientPayment() external givenAppIsRegistered {
        uint256 price = 1 ether;
        _setupAppWithPrice(price);

        uint256 requiredAmount = registry.getAppPrice(address(mockModule));
        uint256 insufficientAmount = requiredAmount - 1;

        hoax(founder, insufficientAmount);
        vm.expectRevert(InsufficientPayment.selector);
        registry.installApp{value: insufficientAmount}(mockModule, appAccount, "");
    }

    function test_installApp_withFreeApp() external givenAppIsRegistered {
        _setupAppWithPrice(0);

        uint256 requiredAmount = registry.getAppPrice(address(mockModule));

        vm.expectEmit(address(appAccount));
        emit IERC6900Account.ExecutionInstalled(
            address(mockModule),
            mockModule.executionManifest()
        );
        hoax(founder, requiredAmount);
        registry.installApp{value: requiredAmount}(mockModule, appAccount, "");

        uint256 protocolFee = _getProtocolFee(0);

        // Verify protocol fee was paid
        assertEq(address(deployer).balance, protocolFee);
    }

    function test_installApp_withPaidApp() external givenAppIsRegistered {
        uint256 price = 1 ether;
        _setupAppWithPrice(price);

        uint256 protocolFee = _getProtocolFee(price);
        uint256 devInitialBalance = address(DEFAULT_DEV).balance;

        uint256 totalPrice = registry.getAppPrice(address(mockModule));

        vm.expectEmit(address(appAccount));
        emit IERC6900Account.ExecutionInstalled(
            address(mockModule),
            mockModule.executionManifest()
        );
        hoax(founder, totalPrice);
        registry.installApp{value: totalPrice}(mockModule, appAccount, "");

        // Verify fee distribution
        assertEq(address(deployer).balance, protocolFee);
        assertEq(address(DEFAULT_DEV).balance - devInitialBalance, totalPrice - protocolFee);
        assertEq(address(appAccount).balance, 0);
    }

    function test_installApp_whenProtocolFeeEqualsPrice() external givenAppIsRegistered {
        // Get minimum protocol fee
        uint256 minFee = IPlatformRequirements(spaceFactory).getMembershipFee();
        _setupAppWithPrice(minFee);

        uint256 devInitialBalance = address(DEFAULT_DEV).balance;

        uint256 totalPrice = registry.getAppPrice(address(mockModule));

        vm.expectEmit(address(appAccount));
        emit IERC6900Account.ExecutionInstalled(
            address(mockModule),
            mockModule.executionManifest()
        );

        hoax(founder, totalPrice);
        registry.installApp{value: totalPrice}(mockModule, appAccount, "");

        assertEq(address(deployer).balance, minFee);
        assertEq(address(DEFAULT_DEV).balance - devInitialBalance, totalPrice - minFee);
        assertEq(address(appAccount).balance, 0);
    }

    function test_installApp_whenBpsHigherThanMinFee() external givenAppIsRegistered {
        uint256 price = 100 ether;
        _setupAppWithPrice(price);

        uint256 protocolFee = _getProtocolFee(price);
        uint256 minFee = IPlatformRequirements(spaceFactory).getMembershipFee();
        uint256 devInitialBalance = address(DEFAULT_DEV).balance;

        uint256 totalPrice = registry.getAppPrice(address(mockModule));

        hoax(founder, totalPrice);
        registry.installApp{value: totalPrice}(mockModule, appAccount, "");

        assertEq(address(deployer).balance, protocolFee);
        assertTrue(protocolFee > minFee);
        assertEq(address(DEFAULT_DEV).balance - devInitialBalance, totalPrice - protocolFee);
        assertEq(address(appAccount).balance, 0);
    }

    function test_installApp_whenBpsLowerThanMinFee() external givenAppIsRegistered {
        uint256 price = 0.005 ether;
        _setupAppWithPrice(price);

        uint256 protocolFee = _getProtocolFee(price);
        uint256 minFee = IPlatformRequirements(spaceFactory).getMembershipFee();
        uint256 bpsFee = BasisPoints.calculate(
            price,
            IPlatformRequirements(spaceFactory).getMembershipBps()
        );
        uint256 devInitialBalance = address(DEFAULT_DEV).balance;

        uint256 totalPrice = registry.getAppPrice(address(mockModule));

        hoax(founder, totalPrice);
        registry.installApp{value: totalPrice}(mockModule, appAccount, "");

        assertEq(address(deployer).balance, protocolFee);
        assertTrue(bpsFee < minFee);
        assertEq(protocolFee, minFee);
        assertEq(address(DEFAULT_DEV).balance - devInitialBalance, totalPrice - protocolFee);
        assertEq(address(appAccount).balance, 0);
    }

    function test_installApp_withExcessPayment() external givenAppIsRegistered {
        uint256 price = 1 ether;
        _setupAppWithPrice(price);

        uint256 totalPrice = registry.getAppPrice(address(mockModule));
        uint256 protocolFee = _getProtocolFee(price);
        uint256 devInitialBalance = address(DEFAULT_DEV).balance;

        uint256 excess = 0.5 ether;
        uint256 payment = totalPrice + excess;
        uint256 founderInitialBalance = address(founder).balance;

        hoax(founder, payment);
        registry.installApp{value: payment}(mockModule, appAccount, "");

        // Verify excess was refunded
        assertEq(address(founder).balance - founderInitialBalance, excess);
        assertEq(address(DEFAULT_DEV).balance - devInitialBalance, totalPrice - protocolFee);
        assertEq(address(appAccount).balance, 0);
    }

    function test_revertWhen_installApp_appRevoked() external givenAppIsRegistered {
        uint256 price = registry.getAppPrice(address(mockModule));

        vm.prank(DEFAULT_DEV);
        registry.removeApp(DEFAULT_APP_ID);

        hoax(founder, price);
        vm.expectRevert(AppRevoked.selector);
        registry.installApp{value: price}(mockModule, appAccount, "");
    }

    function test_revertWhen_installApp_bannedApp() external givenAppIsRegistered {
        vm.prank(deployer);
        registry.adminBanApp(address(mockModule));

        uint256 price = registry.getAppPrice(address(mockModule));

        hoax(founder, price);
        vm.expectRevert(BannedApp.selector);
        registry.installApp{value: price}(mockModule, appAccount, "");
    }

    function test_revertWhen_uninstallApp_notAllowed() external givenAppIsRegistered {
        vm.prank(_randomAddress());
        vm.expectRevert(NotAllowed.selector);
        registry.uninstallApp(mockModule, appAccount, "");
    }

    function test_revertWhen_uninstallApp_appNotRegistered() external {
        vm.prank(founder);
        vm.expectRevert(AppNotRegistered.selector);
        registry.uninstallApp(mockModule, appAccount, "");
    }

    function test_getAppById_getRevokedApp() external givenAppIsRegistered {
        vm.prank(DEFAULT_DEV);
        registry.removeApp(DEFAULT_APP_ID);

        App memory app = registry.getAppById(DEFAULT_APP_ID);
        assertEq(app.appId, DEFAULT_APP_ID);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           RENEW APP TESTS                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_renewApp_flow() external givenAppIsRegistered {
        // First install the app
        uint256 price = 1 ether;
        _setupAppWithPrice(price);
        uint256 totalPrice = registry.getAppPrice(address(mockModule));

        hoax(founder, totalPrice);
        registry.installApp{value: totalPrice}(mockModule, appAccount, "");

        // Get initial expiration
        uint48 initialExpiration = appAccount.getAppExpiration(address(mockModule));

        // Move time forward but not past expiration
        vm.warp(block.timestamp + 30 days);

        // Renew the app
        uint256 devInitialBalance = address(DEFAULT_DEV).balance;
        uint256 protocolFee = _getProtocolFee(price);

        hoax(founder, totalPrice);
        vm.expectEmit(address(registry));
        emit AppRenewed(address(mockModule), address(appAccount), DEFAULT_APP_ID);
        registry.renewApp{value: totalPrice}(mockModule, appAccount, "");

        // Verify new expiration is extended by duration
        uint48 newExpiration = appAccount.getAppExpiration(address(mockModule));
        assertEq(newExpiration, initialExpiration + DEFAULT_ACCESS_DURATION);

        // Verify fee distribution
        assertEq(address(DEFAULT_DEV).balance - devInitialBalance, totalPrice - protocolFee);
        assertEq(address(appAccount).balance, 0);
    }

    function test_renewApp_withFreeApp() external givenAppIsRegistered {
        // First install the app
        _setupAppWithPrice(0);
        uint256 totalPrice = registry.getAppPrice(address(mockModule));
        hoax(founder, totalPrice);
        registry.installApp{value: totalPrice}(mockModule, appAccount, "");

        // Get initial expiration
        uint48 initialExpiration = appAccount.getAppExpiration(address(mockModule));

        // Move time forward but not past expiration
        vm.warp(block.timestamp + 30 days);

        vm.expectEmit(address(registry));
        emit AppRenewed(address(mockModule), address(appAccount), DEFAULT_APP_ID);

        hoax(founder, totalPrice);
        registry.renewApp{value: totalPrice}(mockModule, appAccount, "");

        // Verify new expiration is extended by duration
        uint48 newExpiration = appAccount.getAppExpiration(address(mockModule));
        assertEq(newExpiration, initialExpiration + DEFAULT_ACCESS_DURATION);
    }

    function test_renewApp_withExcessPayment() external givenAppIsRegistered {
        // First install the app
        uint256 price = 1 ether;
        _setupAppWithPrice(price);
        uint256 totalPrice = registry.getAppPrice(address(mockModule));
        hoax(founder, totalPrice);
        registry.installApp{value: totalPrice}(mockModule, appAccount, "");

        // Get initial expiration
        uint48 initialExpiration = appAccount.getAppExpiration(address(mockModule));

        // Move time forward but not past expiration
        vm.warp(block.timestamp + 30 days);

        // Renew with excess payment
        uint256 excess = 0.5 ether;
        uint256 payment = totalPrice + excess;
        uint256 founderInitialBalance = address(founder).balance;

        hoax(founder, payment);
        registry.renewApp{value: payment}(mockModule, appAccount, "");

        // Verify new expiration is extended by duration
        uint48 newExpiration = appAccount.getAppExpiration(address(mockModule));
        assertEq(newExpiration, initialExpiration + DEFAULT_ACCESS_DURATION);

        // Verify excess was refunded
        assertEq(address(founder).balance - founderInitialBalance, excess);
    }

    function test_revertWhen_renewApp_notAllowed() external givenAppIsRegistered {
        // First install the app
        uint256 price = 1 ether;
        _setupAppWithPrice(price);
        uint256 totalPrice = registry.getAppPrice(address(mockModule));
        hoax(founder, totalPrice);
        registry.installApp{value: totalPrice}(mockModule, appAccount, "");

        // Try to renew as non-owner
        vm.prank(_randomAddress());
        vm.expectRevert(NotAllowed.selector);
        registry.renewApp(mockModule, appAccount, "");
    }

    function test_revertWhen_renewApp_appNotInstalled() external givenAppIsRegistered {
        uint256 price = 1 ether;
        _setupAppWithPrice(price);
        uint256 totalPrice = registry.getAppPrice(address(mockModule));

        hoax(founder, totalPrice);
        vm.expectRevert(AppNotInstalled.selector);
        registry.renewApp(mockModule, appAccount, "");
    }

    function test_revertWhen_renewApp_appRevoked() external givenAppIsRegistered {
        // First install the app
        uint256 price = 1 ether;
        _setupAppWithPrice(price);
        uint256 totalPrice = registry.getAppPrice(address(mockModule));
        hoax(founder, totalPrice);
        registry.installApp{value: totalPrice}(mockModule, appAccount, "");

        // Revoke the app
        vm.prank(DEFAULT_DEV);
        registry.removeApp(DEFAULT_APP_ID);

        // Try to renew
        hoax(founder, totalPrice);
        vm.expectRevert(AppRevoked.selector);
        registry.renewApp(mockModule, appAccount, "");
    }

    function test_revertWhen_renewApp_bannedApp() external givenAppIsRegistered {
        // First install the app
        uint256 price = 1 ether;
        _setupAppWithPrice(price);
        uint256 totalPrice = registry.getAppPrice(address(mockModule));
        hoax(founder, totalPrice);
        registry.installApp{value: totalPrice}(mockModule, appAccount, "");

        // Ban the app
        vm.prank(deployer);
        registry.adminBanApp(address(mockModule));

        // Try to renew
        hoax(founder, totalPrice);
        vm.expectRevert(BannedApp.selector);
        registry.renewApp(mockModule, appAccount, "");
    }

    function test_revertWhen_renewApp_insufficientPayment() external givenAppIsRegistered {
        // First install the app
        uint256 price = 1 ether;
        _setupAppWithPrice(price);
        uint256 totalPrice = registry.getAppPrice(address(mockModule));
        hoax(founder, totalPrice);
        registry.installApp{value: totalPrice}(mockModule, appAccount, "");

        // Try to renew with insufficient payment
        uint256 insufficientAmount = totalPrice - 1;
        hoax(founder, insufficientAmount);
        vm.expectRevert(InsufficientPayment.selector);
        registry.renewApp{value: insufficientAmount}(mockModule, appAccount, "");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         ADMIN TESTS                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_adminRegisterAppSchema() external {
        string memory newSchema = "address app, bytes32 newSchema";

        vm.startPrank(deployer);
        bytes32 newSchemaId = registry.adminRegisterAppSchema(
            newSchema,
            ISchemaResolver(address(0)),
            true
        );
        vm.stopPrank();

        assertEq(registry.getAppSchemaId(), newSchemaId);
    }

    function test_adminBanApp() external givenAppIsRegistered {
        vm.prank(deployer);
        bytes32 bannedUid = registry.adminBanApp(address(mockModule));

        assertEq(bannedUid, DEFAULT_APP_ID);
        assertTrue(registry.isAppBanned(address(mockModule)));
    }

    function test_adminBanApp_onlyOwner() external {
        address notOwner = _randomAddress();
        MockPlugin app = new MockPlugin(_randomAddress());

        vm.prank(notOwner);
        vm.expectRevert(abi.encodeWithSelector(IOwnableBase.Ownable__NotOwner.selector, notOwner));
        registry.adminBanApp(address(app));
    }

    function test_revertWhen_adminBanApp_AppNotRegistered() external {
        MockPlugin app = new MockPlugin(_randomAddress());

        // Even the admin cannot ban a app that doesn't exist
        vm.prank(deployer);
        vm.expectRevert(AppNotRegistered.selector);
        registry.adminBanApp(address(app));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Utils                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function _setupAppWithPrice(uint256 price) internal {
        vm.prank(DEFAULT_DEV);
        mockModule.setPrice(price);
    }

    function _getProtocolFee(uint256 installPrice) internal view returns (uint256) {
        IPlatformRequirements platform = IPlatformRequirements(spaceFactory);
        uint256 minPrice = platform.getMembershipFee();
        if (installPrice == 0) return minPrice;
        uint256 basisPointsFee = BasisPoints.calculate(installPrice, platform.getMembershipBps());
        return FixedPointMathLib.max(basisPointsFee, minPrice);
    }
}
