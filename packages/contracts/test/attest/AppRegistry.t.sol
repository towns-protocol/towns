// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// interfaces
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";
import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {IPlatformRequirements} from "src/factory/facets/platform/requirements/IPlatformRequirements.sol";
import {ITownsApp} from "../../src/apps/ITownsApp.sol";

// libraries
import {Attestation} from "@ethereum-attestation-service/eas-contracts/Common.sol";
import {BasisPoints} from "../../src/utils/libraries/BasisPoints.sol";

// types
import {EMPTY_UID} from "@ethereum-attestation-service/eas-contracts/Common.sol";

// contracts
import {AppRegistryBaseTest} from "./AppRegistryBase.t.sol";
import {SimpleAppFacet} from "../../src/apps/simple/app/SimpleAppFacet.sol";
import {MockPlugin} from "../../test/mocks/MockPlugin.sol";
import {AppAccount} from "../../src/spaces/facets/account/AppAccount.sol";
import {MockModule} from "../../test/mocks/MockModule.sol";

contract AppRegistryTest is AppRegistryBaseTest {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       SCHEMA TESTS                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_getAppSchema() external view {
        string memory schema = registry.getAppSchema();
        assertEq(schema, "address app, address client");
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
        vm.expectRevert(AppRegistry__InvalidDuration.selector);
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
        vm.expectRevert(NotAllowed.selector);
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

    function test_createApp() external {
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
        (address app, bytes32 appId) = factory.createApp(appData);

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
        vm.expectRevert(AppFactory__InvalidAppName.selector);
        factory.createApp(appData);
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
        vm.expectRevert(AppFactory__InvalidArrayInput.selector);
        factory.createApp(appData);
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
        vm.expectRevert(AppFactory__InvalidAddressInput.selector);
        factory.createApp(appData);
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
        vm.expectRevert(AppRegistry__InvalidDuration.selector);
        factory.createApp(appData);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      INSTALL APP TESTS                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_installApp() external givenAppIsRegistered {
        App memory appInfo = registry.getAppById(DEFAULT_APP_ID);

        uint256 totalRequired = registry.getAppPrice(address(mockModule));

        hoax(founder, totalRequired);
        vm.expectEmit(address(appAccount));
        emit ExecutionInstalled(address(mockModule), appInfo.manifest);
        installer.installApp{value: totalRequired}(mockModule, appAccount, "");
    }

    function test_revertWhen_installApp_randomAddress_notAllowed() external givenAppIsRegistered {
        vm.prank(_randomAddress());
        vm.expectRevert(NotAllowed.selector);
        installer.installApp(mockModule, appAccount, "");
    }

    function test_revertWhen_installApp_appNotRegistered() external {
        vm.expectRevert(AppNotRegistered.selector);
        vm.prank(founder);
        installer.installApp(mockModule, appAccount, "");
    }

    function test_revertWhen_installApp_insufficientPayment() external givenAppIsRegistered {
        uint256 price = 1 ether;
        _setupAppWithPrice(price);

        uint256 requiredAmount = registry.getAppPrice(address(mockModule));
        uint256 insufficientAmount = requiredAmount - 1;

        hoax(founder, insufficientAmount);
        vm.expectRevert(InsufficientPayment.selector);
        installer.installApp{value: insufficientAmount}(mockModule, appAccount, "");
    }

    function test_installApp_withFreeApp() external givenAppIsRegistered {
        _setupAppWithPrice(0);

        vm.expectEmit(address(appAccount));
        emit ExecutionInstalled(address(mockModule), mockModule.executionManifest());
        vm.prank(founder);
        installer.installApp(mockModule, appAccount, "");

        // verify no fees were paid
        assertEq(address(deployer).balance, 0);
    }

    function test_installApp_revertWhen_installApp_unexpectedETH() external givenAppIsRegistered {
        _setupAppWithPrice(0);

        hoax(founder, 0.1 ether);
        vm.expectRevert(UnexpectedETH.selector);
        installer.installApp{value: 0.1 ether}(mockModule, appAccount, "");
    }

    function test_installApp_withPaidApp() external givenAppIsRegistered {
        uint256 price = 1 ether;
        _setupAppWithPrice(price);

        uint256 protocolFee = _getProtocolFee(price);
        uint256 devInitialBalance = address(DEFAULT_DEV).balance;

        uint256 totalPrice = registry.getAppPrice(address(mockModule));

        vm.expectEmit(address(appAccount));
        emit ExecutionInstalled(address(mockModule), mockModule.executionManifest());
        hoax(founder, totalPrice);
        installer.installApp{value: totalPrice}(mockModule, appAccount, "");

        // Verify fee distribution
        assertEq(address(deployer).balance, protocolFee);
        assertEq(address(mockModule).balance - devInitialBalance, totalPrice - protocolFee);
        assertEq(address(appAccount).balance, 0);
    }

    function test_installApp_whenProtocolFeeEqualsPrice() external givenAppIsRegistered {
        // Get minimum protocol fee
        uint256 minFee = IPlatformRequirements(spaceFactory).getMembershipFee();
        _setupAppWithPrice(minFee);

        uint256 devInitialBalance = address(DEFAULT_DEV).balance;

        uint256 totalPrice = registry.getAppPrice(address(mockModule));

        vm.expectEmit(address(appAccount));
        emit ExecutionInstalled(address(mockModule), mockModule.executionManifest());

        hoax(founder, totalPrice);
        installer.installApp{value: totalPrice}(mockModule, appAccount, "");

        assertEq(address(deployer).balance, minFee);
        assertEq(address(mockModule).balance - devInitialBalance, totalPrice - minFee);
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
        installer.installApp{value: totalPrice}(mockModule, appAccount, "");

        assertEq(address(deployer).balance, protocolFee);
        assertTrue(protocolFee > minFee);
        assertEq(address(mockModule).balance - devInitialBalance, totalPrice - protocolFee);
        assertEq(address(appAccount).balance, 0);
    }

    function test_installApp_whenBpsLowerThanMinFee() external givenAppIsRegistered {
        uint256 price = 0.004 ether;
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
        installer.installApp{value: totalPrice}(mockModule, appAccount, "");

        assertEq(address(deployer).balance, protocolFee);
        assertTrue(bpsFee < minFee);
        assertEq(protocolFee, minFee);
        assertEq(address(mockModule).balance - devInitialBalance, totalPrice - protocolFee);
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
        installer.installApp{value: payment}(mockModule, appAccount, "");

        // Verify excess was refunded
        assertEq(address(founder).balance - founderInitialBalance, excess);
        assertEq(address(mockModule).balance - devInitialBalance, totalPrice - protocolFee);
        assertEq(address(appAccount).balance, 0);
    }

    function test_revertWhen_installApp_appRevoked() external givenAppIsRegistered {
        uint256 price = registry.getAppPrice(address(mockModule));

        vm.prank(DEFAULT_DEV);
        registry.removeApp(DEFAULT_APP_ID);

        hoax(founder, price);
        vm.expectRevert(AppRevoked.selector);
        installer.installApp{value: price}(mockModule, appAccount, "");
    }

    function test_revertWhen_installApp_bannedApp() external givenAppIsRegistered {
        vm.prank(deployer);
        registry.adminBanApp(address(mockModule));

        uint256 price = registry.getAppPrice(address(mockModule));

        hoax(founder, price);
        vm.expectRevert(BannedApp.selector);
        installer.installApp{value: price}(mockModule, appAccount, "");
    }

    function test_revertWhen_uninstallApp_notAllowed() external givenAppIsRegistered {
        vm.prank(_randomAddress());
        vm.expectRevert(NotAllowed.selector);
        installer.uninstallApp(mockModule, appAccount, "");
    }

    function test_revertWhen_uninstallApp_appNotRegistered() external {
        vm.prank(founder);
        vm.expectRevert(AppNotRegistered.selector);
        installer.uninstallApp(mockModule, appAccount, "");
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
        installer.installApp{value: totalPrice}(mockModule, appAccount, "");

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
        installer.renewApp{value: totalPrice}(mockModule, appAccount, "");

        // Verify new expiration is extended by duration
        uint48 newExpiration = appAccount.getAppExpiration(address(mockModule));
        assertEq(newExpiration, initialExpiration + DEFAULT_ACCESS_DURATION);

        // Verify fee distribution
        assertEq(address(mockModule).balance - devInitialBalance, totalPrice - protocolFee);
        assertEq(address(appAccount).balance, 0);
    }

    function test_renewApp_withFreeApp() external givenAppIsRegistered {
        // First install the app
        _setupAppWithPrice(0);
        uint256 totalPrice = registry.getAppPrice(address(mockModule));
        hoax(founder, totalPrice);
        installer.installApp{value: totalPrice}(mockModule, appAccount, "");

        // Get initial expiration
        uint48 initialExpiration = appAccount.getAppExpiration(address(mockModule));

        // Move time forward but not past expiration
        vm.warp(block.timestamp + 30 days);

        vm.expectEmit(address(registry));
        emit AppRenewed(address(mockModule), address(appAccount), DEFAULT_APP_ID);

        hoax(founder, totalPrice);
        installer.renewApp{value: totalPrice}(mockModule, appAccount, "");

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
        installer.installApp{value: totalPrice}(mockModule, appAccount, "");

        // Get initial expiration
        uint48 initialExpiration = appAccount.getAppExpiration(address(mockModule));

        // Move time forward but not past expiration
        vm.warp(block.timestamp + 30 days);

        // Renew with excess payment
        uint256 excess = 0.5 ether;
        uint256 payment = totalPrice + excess;
        uint256 founderInitialBalance = address(founder).balance;

        hoax(founder, payment);
        installer.renewApp{value: payment}(mockModule, appAccount, "");

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
        installer.installApp{value: totalPrice}(mockModule, appAccount, "");

        // Try to renew as non-owner
        vm.prank(_randomAddress());
        vm.expectRevert(NotAllowed.selector);
        installer.renewApp(mockModule, appAccount, "");
    }

    function test_revertWhen_renewApp_appNotInstalled() external givenAppIsRegistered {
        uint256 price = 1 ether;
        _setupAppWithPrice(price);
        uint256 totalPrice = registry.getAppPrice(address(mockModule));

        hoax(founder, totalPrice);
        vm.expectRevert(AppNotInstalled.selector);
        installer.renewApp(mockModule, appAccount, "");
    }

    function test_revertWhen_renewApp_appRevoked() external givenAppIsRegistered {
        // First install the app
        uint256 price = 1 ether;
        _setupAppWithPrice(price);
        uint256 totalPrice = registry.getAppPrice(address(mockModule));
        hoax(founder, totalPrice);
        installer.installApp{value: totalPrice}(mockModule, appAccount, "");

        // Revoke the app
        vm.prank(DEFAULT_DEV);
        registry.removeApp(DEFAULT_APP_ID);

        // Try to renew
        hoax(founder, totalPrice);
        vm.expectRevert(AppRevoked.selector);
        installer.renewApp(mockModule, appAccount, "");
    }

    function test_revertWhen_renewApp_bannedApp() external givenAppIsRegistered {
        // First install the app
        uint256 price = 1 ether;
        _setupAppWithPrice(price);
        uint256 totalPrice = registry.getAppPrice(address(mockModule));
        hoax(founder, totalPrice);
        installer.installApp{value: totalPrice}(mockModule, appAccount, "");

        // Ban the app
        vm.prank(deployer);
        registry.adminBanApp(address(mockModule));

        // Try to renew
        hoax(founder, totalPrice);
        vm.expectRevert(BannedApp.selector);
        installer.renewApp(mockModule, appAccount, "");
    }

    function test_revertWhen_renewApp_insufficientPayment() external givenAppIsRegistered {
        // First install the app
        uint256 price = 1 ether;
        _setupAppWithPrice(price);
        uint256 totalPrice = registry.getAppPrice(address(mockModule));
        hoax(founder, totalPrice);
        installer.installApp{value: totalPrice}(mockModule, appAccount, "");

        // Try to renew with insufficient payment
        uint256 insufficientAmount = totalPrice - 1;
        hoax(founder, insufficientAmount);
        vm.expectRevert(InsufficientPayment.selector);
        installer.renewApp{value: insufficientAmount}(mockModule, appAccount, "");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      UPGRADE APP TESTS                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_upgradeApp() external givenSimpleAppIsRegistered {
        SimpleAppFacet appContract = SimpleAppFacet(SIMPLE_APP);

        uint256 totalRequired = registry.getAppPrice(address(appContract));

        hoax(founder, totalRequired);
        installer.installApp{value: totalRequired}(appContract, appAccount, "");

        assertTrue(appAccount.isAppEntitled(address(appContract), DEFAULT_CLIENT, bytes32("Read")));

        bytes32[] memory newPermissions = new bytes32[](2);
        newPermissions[0] = bytes32("Read");
        newPermissions[1] = bytes32("Write");

        vm.prank(DEFAULT_DEV);
        appContract.updatePermissions(newPermissions);

        assertFalse(
            appAccount.isAppEntitled(address(appContract), DEFAULT_CLIENT, newPermissions[1])
        );

        vm.prank(DEFAULT_DEV);
        bytes32 newAppId = registry.upgradeApp(appContract, DEFAULT_CLIENT, SIMPLE_APP_ID);

        vm.prank(founder);
        vm.expectEmit(address(registry));
        emit AppUpdated(address(appContract), address(appAccount), newAppId);
        installer.updateApp(appContract, appAccount);

        assertTrue(
            appAccount.isAppEntitled(address(appContract), DEFAULT_CLIENT, newPermissions[1])
        );
    }

    function test_revertWhen_upgradeApp_notAllowed() external givenSimpleAppIsRegistered {
        vm.prank(_randomAddress());
        vm.expectRevert(NotAllowed.selector);
        registry.upgradeApp(SimpleAppFacet(SIMPLE_APP), DEFAULT_CLIENT, SIMPLE_APP_ID);
    }

    function test_revertWhen_upgradeApp_invalidAppId() external givenSimpleAppIsRegistered {
        vm.prank(DEFAULT_DEV);
        vm.expectRevert(InvalidAppId.selector);
        registry.upgradeApp(SimpleAppFacet(SIMPLE_APP), DEFAULT_CLIENT, EMPTY_UID);
    }

    function test_revertWhen_upgradeApp_appIsBanned() external givenSimpleAppIsRegistered {
        vm.prank(deployer);
        registry.adminBanApp(address(SimpleAppFacet(SIMPLE_APP)));

        vm.prank(DEFAULT_DEV);
        vm.expectRevert(BannedApp.selector);
        registry.upgradeApp(SimpleAppFacet(SIMPLE_APP), DEFAULT_CLIENT, SIMPLE_APP_ID);
    }

    function test_revertWhen_upgradeApp_clientNotRegistered() external givenSimpleAppIsRegistered {
        vm.prank(DEFAULT_DEV);
        vm.expectRevert(ClientNotRegistered.selector);
        registry.upgradeApp(SimpleAppFacet(SIMPLE_APP), _randomAddress(), SIMPLE_APP_ID);
    }

    function test_revertWhen_upgradeApp_appIsNotLatestVersion(
        bytes32 newAppId
    ) external givenSimpleAppIsRegistered {
        vm.assume(newAppId != SIMPLE_APP_ID);
        vm.assume(newAppId != EMPTY_UID);

        vm.prank(DEFAULT_DEV);
        vm.expectRevert(InvalidAppId.selector);
        registry.upgradeApp(SimpleAppFacet(SIMPLE_APP), DEFAULT_CLIENT, newAppId);
    }

    function test_revertWhen_updateApp_notAllowed(
        address notAllowed
    ) external givenSimpleAppIsRegistered {
        vm.assume(notAllowed != founder);
        vm.assume(notAllowed != address(0));
        vm.assume(notAllowed != address(appAccount));

        vm.prank(notAllowed);
        vm.expectRevert(NotAllowed.selector);
        installer.updateApp(SimpleAppFacet(SIMPLE_APP), appAccount);
    }

    function test_revertWhen_updateApp_appNotInstalled() external givenSimpleAppIsRegistered {
        vm.prank(founder);
        vm.expectRevert(AppNotInstalled.selector);
        installer.updateApp(SimpleAppFacet(SIMPLE_APP), appAccount);
    }

    function test_revertWhen_updateApp_appAlreadyInstalled() external givenSimpleAppIsRegistered {
        SimpleAppFacet appContract = SimpleAppFacet(SIMPLE_APP);
        address appAddress = address(appContract);
        uint256 totalRequired = registry.getAppPrice(appAddress);

        hoax(founder, totalRequired);
        installer.installApp{value: totalRequired}(appContract, appAccount, "");

        vm.prank(founder);
        vm.expectRevert(AppAlreadyInstalled.selector);
        installer.updateApp(appContract, appAccount);
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
    /*                     IDENTITY REGISTRY TESTS                 */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_publishAgent(string calldata uri) external givenSimpleAppIsRegistered {
        MetadataEntry[] memory metadata = new MetadataEntry[](0);

        vm.prank(DEFAULT_DEV);
        uint256 agentId = simpleApp.promoteAgent(uri, metadata);

        assertEq(agentId, 1);
        assertEq(identityRegistry.tokenURI(agentId), uri);
    }
}
