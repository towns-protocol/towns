// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ITownsApp} from "src/apps/ITownsApp.sol";
import {IAppAccount} from "src/spaces/facets/account/IAppAccount.sol";
import {IAppFactoryBase} from "src/apps/facets/factory/IAppFactory.sol";
import {IAppRegistryBase} from "src/apps/facets/registry/IAppRegistry.sol";
import {ISimpleApp} from "src/apps/simple/app/ISimpleApp.sol";

// types
import {ExecutionManifest} from "@erc6900/reference-implementation/interfaces/IExecutionModule.sol";

// libraries
import {AppManagerMod} from "../../src/account/facets/app/AppManagerMod.sol";

// contracts
import {ERC6900Setup} from "./ERC6900Setup.sol";
import {AppRegistryBaseTest} from "../attest/AppRegistryBase.t.sol";
import {ModularAccount} from "modular-account/src/account/ModularAccount.sol";
import {AccountHubFacet} from "../../src/account/facets/hub/AccountHubFacet.sol";
import {DeployAccountModules} from "../../scripts/deployments/diamonds/DeployAccountModules.s.sol";

contract AppManagerTest is AppRegistryBaseTest, ERC6900Setup {
    DeployAccountModules internal deployAccountModules;

    AccountHubFacet internal accountHub;

    function setUp() public override(AppRegistryBaseTest, ERC6900Setup) {
        super.setUp();

        deployAccountModules = new DeployAccountModules();
        deployAccountModules.setDependencies(spaceFactory, appRegistry);
        address mod = deployAccountModules.deploy(deployer);

        accountHub = AccountHubFacet(mod);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      INSTALL APP TESTS                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_installApp(address user) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);

        ITownsApp appContract = ITownsApp(address(SIMPLE_APP));
        uint256 totalPrice = registry.getAppPrice(address(appContract));

        hoax(account, totalPrice);
        vm.expectEmit(address(installer));
        emit AppInstalled(address(SIMPLE_APP), address(account), SIMPLE_APP_ID);
        installer.installApp{value: totalPrice}(appContract, IAppAccount(account), "");

        assertTrue(IAppAccount(account).isAppInstalled(address(appContract)));
    }

    function test_installApp_setsCorrectState(address user) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);
        ITownsApp appContract = ITownsApp(address(SIMPLE_APP));
        _installAppToAccount(account, appContract);

        IAppAccount appAccount = IAppAccount(account);

        // Verify isAppInstalled
        assertTrue(appAccount.isAppInstalled(address(appContract)));

        // Verify getAppId returns correct appId
        assertEq(appAccount.getAppId(address(appContract)), SIMPLE_APP_ID);

        // Verify getAppExpiration is set correctly (block.timestamp + duration)
        uint48 expiration = appAccount.getAppExpiration(address(appContract));
        assertEq(expiration, uint48(block.timestamp) + DEFAULT_ACCESS_DURATION);

        // Verify getInstalledApps includes this app
        address[] memory installedApps = appAccount.getInstalledApps();
        assertEq(installedApps.length, 1);
        assertEq(installedApps[0], address(appContract));
    }

    function test_installApp_revertWhen_AppAlreadyInstalled(
        address user
    ) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);
        ITownsApp appContract = ITownsApp(address(SIMPLE_APP));
        _installAppToAccount(account, appContract);

        // Try to install again via installer - should revert
        uint256 totalPrice = registry.getAppPrice(address(appContract));
        hoax(account, totalPrice);
        vm.expectRevert(AppManagerMod.AppManager__AppAlreadyInstalled.selector);
        installer.installApp{value: totalPrice}(appContract, IAppAccount(account), "");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     UNINSTALL APP TESTS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_uninstallApp(address user) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);

        ITownsApp appContract = ITownsApp(address(SIMPLE_APP));
        uint256 totalPrice = registry.getAppPrice(address(appContract));

        hoax(account, totalPrice);
        installer.installApp{value: totalPrice}(appContract, IAppAccount(account), "");

        vm.prank(account);
        installer.uninstallApp(appContract, IAppAccount(account), "");

        assertFalse(IAppAccount(account).isAppInstalled(address(appContract)));
    }

    function test_uninstallApp_clearsAllState(address user) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);
        ITownsApp appContract = ITownsApp(address(SIMPLE_APP));
        _installAppToAccount(account, appContract);

        IAppAccount appAccount = IAppAccount(account);

        // Verify installed
        assertTrue(appAccount.isAppInstalled(address(appContract)));

        // Uninstall
        vm.prank(account);
        installer.uninstallApp(appContract, appAccount, "");

        // Verify state is cleared
        assertFalse(appAccount.isAppInstalled(address(appContract)));
        assertEq(appAccount.getAppId(address(appContract)), bytes32(0));
        assertEq(appAccount.getAppExpiration(address(appContract)), 0);

        // Verify removed from installed apps list
        address[] memory installedApps = appAccount.getInstalledApps();
        assertEq(installedApps.length, 0);
    }

    function test_uninstallApp_revertWhen_AppNotRegistered(
        address user
    ) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);
        ITownsApp appContract = ITownsApp(address(SIMPLE_APP));

        // Try to uninstall without installing first
        vm.expectRevert(IAppRegistryBase.AppNotRegistered.selector);
        vm.prank(account);
        installer.uninstallApp(appContract, IAppAccount(account), "");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      RENEW APP TESTS                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_renewApp(address user) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);
        ITownsApp appContract = ITownsApp(address(SIMPLE_APP));
        _installAppToAccount(account, appContract);

        IAppAccount appAccount = IAppAccount(account);
        uint48 originalExpiration = appAccount.getAppExpiration(address(appContract));

        // Renew the app
        uint256 totalPrice = registry.getAppPrice(address(appContract));
        hoax(account, totalPrice);
        installer.renewApp{value: totalPrice}(appContract, appAccount, "");

        // Expiration should be extended from current expiration (not expired yet)
        uint48 newExpiration = appAccount.getAppExpiration(address(appContract));
        assertEq(newExpiration, originalExpiration + DEFAULT_ACCESS_DURATION);
    }

    function test_renewApp_extendsFromNow_whenExpired(
        address user
    ) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);
        ITownsApp appContract = ITownsApp(address(SIMPLE_APP));
        _installAppToAccount(account, appContract);

        IAppAccount appAccount = IAppAccount(account);

        // Warp past expiration
        vm.warp(block.timestamp + DEFAULT_ACCESS_DURATION + 1);

        // Renew the app
        uint256 totalPrice = registry.getAppPrice(address(appContract));
        hoax(account, totalPrice);
        installer.renewApp{value: totalPrice}(appContract, appAccount, "");

        // Expiration should be extended from now (was expired)
        uint48 newExpiration = appAccount.getAppExpiration(address(appContract));
        assertEq(newExpiration, uint48(block.timestamp) + DEFAULT_ACCESS_DURATION);
    }

    function test_renewApp_revertWhen_AppNotInstalled(
        address user
    ) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);
        ITownsApp appContract = ITownsApp(address(SIMPLE_APP));

        // Try to renew without installing first
        uint256 totalPrice = registry.getAppPrice(address(appContract));
        vm.expectRevert(IAppRegistryBase.AppNotInstalled.selector);
        hoax(account, totalPrice);
        installer.renewApp{value: totalPrice}(appContract, IAppAccount(account), "");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      UPDATE APP TESTS                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_updateApp(address user) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);
        ITownsApp appContract = ITownsApp(address(SIMPLE_APP));
        _installAppToAccount(account, appContract);

        bytes32[] memory permissions = new bytes32[](1);
        permissions[0] = bytes32("Write");

        vm.prank(DEFAULT_DEV);
        ISimpleApp(address(SIMPLE_APP)).updatePermissions(permissions);

        vm.prank(DEFAULT_DEV);
        bytes32 newAppId = registry.upgradeApp(appContract, DEFAULT_CLIENT, SIMPLE_APP_ID);

        IAppAccount appAccount = IAppAccount(account);
        uint256 totalPrice = registry.getAppPrice(address(appContract));

        hoax(account, totalPrice);
        installer.updateApp(appContract, appAccount);

        assertTrue(appAccount.isAppEntitled(address(appContract), DEFAULT_CLIENT, permissions[0]));
        assertTrue(appAccount.getAppId(address(appContract)) == newAppId);
    }

    function test_updateApp_revertWhen_AppNotInstalled(
        address user
    ) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);
        ITownsApp appContract = ITownsApp(address(SIMPLE_APP));

        // Try to update without installing first
        vm.expectRevert(AppManagerMod.AppManager__AppNotInstalled.selector);
        vm.prank(account);
        installer.updateApp(appContract, IAppAccount(account));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   ENABLE/DISABLE APP TESTS                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_disableApp(address user) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);
        ITownsApp appContract = ITownsApp(address(SIMPLE_APP));
        _installAppToAccount(account, appContract);

        IAppAccount appAccount = IAppAccount(account);

        // App should be installed and active
        assertTrue(appAccount.isAppInstalled(address(appContract)));

        // Disable the app
        vm.prank(account);
        appAccount.disableApp(address(appContract));

        // App should no longer be considered "installed" (active = false)
        assertFalse(appAccount.isAppInstalled(address(appContract)));

        // But appId should still be retrievable
        assertEq(appAccount.getAppId(address(appContract)), SIMPLE_APP_ID);
    }

    function test_enableApp(address user) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);
        ITownsApp appContract = ITownsApp(address(SIMPLE_APP));
        _installAppToAccount(account, appContract);

        IAppAccount appAccount = IAppAccount(account);

        // Disable first
        vm.prank(account);
        appAccount.disableApp(address(appContract));
        assertFalse(appAccount.isAppInstalled(address(appContract)));

        // Re-enable
        vm.prank(account);
        appAccount.enableApp(address(appContract));
        assertTrue(appAccount.isAppInstalled(address(appContract)));
    }

    function test_disableApp_removesFromGetInstalledApps(
        address user
    ) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);
        ITownsApp appContract = ITownsApp(address(SIMPLE_APP));
        _installAppToAccount(account, appContract);

        IAppAccount appAccount = IAppAccount(account);

        // Initially in the list
        address[] memory apps = appAccount.getInstalledApps();
        assertEq(apps.length, 1);
        assertEq(apps[0], address(appContract));

        // Disable
        vm.prank(account);
        appAccount.disableApp(address(appContract));

        // Should be removed from the list
        apps = appAccount.getInstalledApps();
        assertEq(apps.length, 0);
    }

    function test_enableApp_idempotent(address user) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);
        ITownsApp appContract = ITownsApp(address(SIMPLE_APP));
        _installAppToAccount(account, appContract);

        IAppAccount appAccount = IAppAccount(account);

        // Enable an already-enabled app (should not revert)
        vm.prank(account);
        appAccount.enableApp(address(appContract));

        assertTrue(appAccount.isAppInstalled(address(appContract)));
    }

    function test_disableApp_idempotent(address user) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);
        ITownsApp appContract = ITownsApp(address(SIMPLE_APP));
        _installAppToAccount(account, appContract);

        IAppAccount appAccount = IAppAccount(account);

        // Disable
        vm.prank(account);
        appAccount.disableApp(address(appContract));

        // Disable again (should not revert)
        vm.prank(account);
        appAccount.disableApp(address(appContract));

        assertFalse(appAccount.isAppInstalled(address(appContract)));
    }

    function test_enableApp_revertWhen_AppNotInstalled(
        address user
    ) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);
        ITownsApp appContract = ITownsApp(address(SIMPLE_APP));

        IAppAccount appAccount = IAppAccount(account);

        // Try to enable without installing first
        vm.expectRevert(AppManagerMod.AppManager__AppNotInstalled.selector);
        vm.prank(account);
        appAccount.enableApp(address(appContract));
    }

    function test_disableApp_revertWhen_AppNotInstalled(
        address user
    ) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);
        ITownsApp appContract = ITownsApp(address(SIMPLE_APP));

        IAppAccount appAccount = IAppAccount(account);

        // Try to disable without installing first
        vm.expectRevert(AppManagerMod.AppManager__AppNotInstalled.selector);
        vm.prank(account);
        appAccount.disableApp(address(appContract));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    VIEW FUNCTION TESTS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_isAppInstalled_returnsFalse_whenNotInstalled(
        address user
    ) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);
        ITownsApp appContract = ITownsApp(address(SIMPLE_APP));

        IAppAccount appAccount = IAppAccount(account);
        assertFalse(appAccount.isAppInstalled(address(appContract)));
    }

    function test_getAppId_returnsZero_whenNotInstalled(
        address user
    ) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);
        ITownsApp appContract = ITownsApp(address(SIMPLE_APP));

        IAppAccount appAccount = IAppAccount(account);
        assertEq(appAccount.getAppId(address(appContract)), bytes32(0));
    }

    function test_getAppExpiration_returnsZero_whenNotInstalled(
        address user
    ) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);
        ITownsApp appContract = ITownsApp(address(SIMPLE_APP));

        IAppAccount appAccount = IAppAccount(account);
        assertEq(appAccount.getAppExpiration(address(appContract)), 0);
    }

    function test_getInstalledApps_returnsEmpty_whenNoAppsInstalled(
        address user
    ) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);

        IAppAccount appAccount = IAppAccount(account);
        address[] memory apps = appAccount.getInstalledApps();
        assertEq(apps.length, 0);
    }

    function test_getAppId_persistsAfterDisable(address user) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);
        ITownsApp appContract = ITownsApp(address(SIMPLE_APP));
        _installAppToAccount(account, appContract);

        IAppAccount appAccount = IAppAccount(account);

        // Disable
        vm.prank(account);
        appAccount.disableApp(address(appContract));

        // AppId should still be retrievable
        assertEq(appAccount.getAppId(address(appContract)), SIMPLE_APP_ID);
    }

    function test_getAppExpiration_persistsAfterDisable(
        address user
    ) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);
        ITownsApp appContract = ITownsApp(address(SIMPLE_APP));
        _installAppToAccount(account, appContract);

        IAppAccount appAccount = IAppAccount(account);
        uint48 expiration = appAccount.getAppExpiration(address(appContract));

        // Disable
        vm.prank(account);
        appAccount.disableApp(address(appContract));

        // Expiration should still be retrievable
        assertEq(appAccount.getAppExpiration(address(appContract)), expiration);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     ENTITLEMENT TESTS                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_isAppEntitled_returnsTrue_withValidPermission(
        address user
    ) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);
        ITownsApp appContract = ITownsApp(address(SIMPLE_APP));
        _installAppToAccount(account, appContract);

        IAppAccount appAccount = IAppAccount(account);

        // The SIMPLE_APP has "Read" permission and DEFAULT_CLIENT as the client
        bytes32 readPermission = bytes32("Read");
        assertTrue(appAccount.isAppEntitled(address(appContract), DEFAULT_CLIENT, readPermission));
    }

    function test_isAppEntitled_returnsFalse_whenAppNotInstalled(
        address user
    ) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);
        ITownsApp appContract = ITownsApp(address(SIMPLE_APP));

        IAppAccount appAccount = IAppAccount(account);

        bytes32 readPermission = bytes32("Read");
        assertFalse(appAccount.isAppEntitled(address(appContract), DEFAULT_CLIENT, readPermission));
    }

    function test_isAppEntitled_returnsFalse_whenAppDisabled(
        address user
    ) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);
        ITownsApp appContract = ITownsApp(address(SIMPLE_APP));
        _installAppToAccount(account, appContract);

        IAppAccount appAccount = IAppAccount(account);

        // Disable the app
        vm.prank(account);
        appAccount.disableApp(address(appContract));

        bytes32 readPermission = bytes32("Read");
        assertFalse(appAccount.isAppEntitled(address(appContract), DEFAULT_CLIENT, readPermission));
    }

    function test_isAppEntitled_returnsFalse_whenAppExpired(
        address user
    ) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);
        ITownsApp appContract = ITownsApp(address(SIMPLE_APP));
        _installAppToAccount(account, appContract);

        IAppAccount appAccount = IAppAccount(account);

        // Warp past expiration
        vm.warp(block.timestamp + DEFAULT_ACCESS_DURATION + 1);

        bytes32 readPermission = bytes32("Read");
        assertFalse(appAccount.isAppEntitled(address(appContract), DEFAULT_CLIENT, readPermission));
    }

    function test_isAppEntitled_returnsFalse_whenWrongClient(
        address user,
        address wrongClient
    ) external givenSimpleAppIsRegistered {
        vm.assume(wrongClient != DEFAULT_CLIENT);
        address account = _createAccountWithHubInstalled(user);
        ITownsApp appContract = ITownsApp(address(SIMPLE_APP));
        _installAppToAccount(account, appContract);

        IAppAccount appAccount = IAppAccount(account);

        bytes32 readPermission = bytes32("Read");
        assertFalse(appAccount.isAppEntitled(address(appContract), wrongClient, readPermission));
    }

    function test_isAppEntitled_returnsFalse_whenPermissionNotGranted(
        address user
    ) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);
        ITownsApp appContract = ITownsApp(address(SIMPLE_APP));
        _installAppToAccount(account, appContract);

        IAppAccount appAccount = IAppAccount(account);

        // Try with a permission that wasn't granted ("Write" instead of "Read")
        bytes32 writePermission = bytes32("Write");
        assertFalse(
            appAccount.isAppEntitled(address(appContract), DEFAULT_CLIENT, writePermission)
        );
    }

    function test_isAppEntitled_returnsFalse_whenAppBanned(
        address user
    ) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);
        ITownsApp appContract = ITownsApp(address(SIMPLE_APP));
        _installAppToAccount(account, appContract);

        IAppAccount appAccount = IAppAccount(account);

        // Ban the app
        vm.prank(deployer);
        registry.adminBanApp(address(appContract));

        bytes32 readPermission = bytes32("Read");
        assertFalse(appAccount.isAppEntitled(address(appContract), DEFAULT_CLIENT, readPermission));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    MULTIPLE APPS TESTS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_installMultipleApps(address user) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);

        // Install first app
        ITownsApp app1 = ITownsApp(address(SIMPLE_APP));
        _installAppToAccount(account, app1);

        // Create and install second app
        (address app2Addr, bytes32 app2Id) = _createSecondApp();
        ITownsApp app2 = ITownsApp(app2Addr);
        _installAppToAccount(account, app2);

        IAppAccount appAccount = IAppAccount(account);

        // Both apps should be installed
        assertTrue(appAccount.isAppInstalled(address(app1)));
        assertTrue(appAccount.isAppInstalled(address(app2)));

        // Both should be in the installed apps list
        address[] memory apps = appAccount.getInstalledApps();
        assertEq(apps.length, 2);

        // Verify app IDs
        assertEq(appAccount.getAppId(address(app1)), SIMPLE_APP_ID);
        assertEq(appAccount.getAppId(address(app2)), app2Id);
    }

    function test_uninstallOneOfMultipleApps(address user) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);

        // Install first app
        ITownsApp app1 = ITownsApp(address(SIMPLE_APP));
        _installAppToAccount(account, app1);

        // Create and install second app
        (address app2Addr, ) = _createSecondApp();
        ITownsApp app2 = ITownsApp(app2Addr);
        _installAppToAccount(account, app2);

        IAppAccount appAccount = IAppAccount(account);

        // Uninstall the first app
        vm.prank(account);
        installer.uninstallApp(app1, appAccount, "");

        // Only second app should be installed
        assertFalse(appAccount.isAppInstalled(address(app1)));
        assertTrue(appAccount.isAppInstalled(address(app2)));

        // Only second app should be in the list
        address[] memory apps = appAccount.getInstalledApps();
        assertEq(apps.length, 1);
        assertEq(apps[0], address(app2));
    }

    function test_disableOneOfMultipleApps(address user) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);

        // Install first app
        ITownsApp app1 = ITownsApp(address(SIMPLE_APP));
        _installAppToAccount(account, app1);

        // Create and install second app
        (address app2Addr, ) = _createSecondApp();
        ITownsApp app2 = ITownsApp(app2Addr);
        _installAppToAccount(account, app2);

        IAppAccount appAccount = IAppAccount(account);

        // Disable the first app
        vm.prank(account);
        appAccount.disableApp(address(app1));

        // First app should appear as not installed, second should be installed
        assertFalse(appAccount.isAppInstalled(address(app1)));
        assertTrue(appAccount.isAppInstalled(address(app2)));

        // Only second app should be in the active installed apps list
        address[] memory apps = appAccount.getInstalledApps();
        assertEq(apps.length, 1);
        assertEq(apps[0], address(app2));

        // Re-enable first app
        vm.prank(account);
        appAccount.enableApp(address(app1));

        // Both should be in the list again
        apps = appAccount.getInstalledApps();
        assertEq(apps.length, 2);
    }

    function _createAccountWithHubInstalled(address user) internal returns (address account) {
        ModularAccount userAccount = _createAccount(user, 0);
        _installExecution(
            userAccount,
            address(accountHub),
            accountHub.executionManifest(),
            abi.encode(address(userAccount))
        );
        return address(userAccount);
    }

    function _installAppToAccount(address account, ITownsApp app) internal {
        uint256 totalPrice = registry.getAppPrice(address(app));
        hoax(account, totalPrice);
        installer.installApp{value: totalPrice}(app, IAppAccount(account), "");
    }

    function _createSecondApp() internal returns (address app, bytes32 appId) {
        bytes32[] memory permissions = new bytes32[](1);
        permissions[0] = bytes32("Write");
        address secondClient = _randomAddress();
        IAppFactoryBase.AppParams memory appData = IAppFactoryBase.AppParams({
            name: "second.app",
            permissions: permissions,
            client: secondClient,
            installPrice: DEFAULT_INSTALL_PRICE,
            accessDuration: DEFAULT_ACCESS_DURATION
        });

        vm.prank(DEFAULT_DEV);
        (app, appId) = factory.createApp(appData);
    }
}
