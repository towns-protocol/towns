// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

//interfaces

import {ITownsApp} from "../../src/apps/ITownsApp.sol";
import {SimpleApp} from "../../src/apps/helpers/SimpleApp.sol";
import {ISimpleAppBase} from "../../src/apps/helpers/ISimpleApp.sol";

//libraries
import {Attestation} from "@ethereum-attestation-service/eas-contracts/Common.sol";

// types
import {EMPTY_UID} from "@ethereum-attestation-service/eas-contracts/Common.sol";

//contracts

import {AppAccount} from "../../src/spaces/facets/account/AppAccount.sol";

import {AppRegistryBaseTest} from "./AppRegistryBase.t.sol";

contract SimpleAppTest is AppRegistryBaseTest {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      UPGRADE APP TESTS                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_upgradeApp() external {
        address simpleApp = _createSimpleApp(DEFAULT_CLIENT);

        uint256 totalRequired = registry.getAppPrice(simpleApp);

        hoax(founder, totalRequired);
        registry.installApp{value: totalRequired}(ITownsApp(simpleApp), appAccount, "");

        assertTrue(appAccount.isAppEntitled(simpleApp, DEFAULT_CLIENT, bytes32("Read")));

        bytes32[] memory newPermissions = new bytes32[](2);
        newPermissions[0] = bytes32("Read");
        newPermissions[1] = bytes32("Write");

        vm.prank(DEFAULT_DEV);
        SimpleApp(payable(simpleApp)).updatePermissions(newPermissions);

        assertFalse(appAccount.isAppEntitled(simpleApp, DEFAULT_CLIENT, newPermissions[1]));

        bytes32 appId = registry.getLatestAppId(simpleApp);

        vm.prank(DEFAULT_DEV);
        bytes32 newAppId = registry.upgradeApp(ITownsApp(simpleApp), DEFAULT_CLIENT, appId);

        vm.prank(founder);
        vm.expectEmit(address(registry));
        emit AppUpdated(simpleApp, address(appAccount), newAppId);
        registry.updateApp(ITownsApp(simpleApp), appAccount);

        assertTrue(appAccount.isAppEntitled(simpleApp, DEFAULT_CLIENT, newPermissions[1]));
    }

    function test_revertWhen_upgradeApp_notAllowed() external givenSimpleAppIsCreated {
        vm.prank(_randomAddress());
        vm.expectRevert(NotAllowed.selector);
        registry.upgradeApp(SimpleApp(SIMPLE_APP), DEFAULT_CLIENT, SIMPLE_APP_ID);
    }

    function test_revertWhen_upgradeApp_invalidAppId() external givenSimpleAppIsCreated {
        vm.prank(DEFAULT_DEV);
        vm.expectRevert(InvalidAppId.selector);
        registry.upgradeApp(SimpleApp(SIMPLE_APP), DEFAULT_CLIENT, EMPTY_UID);
    }

    function test_revertWhen_upgradeApp_appIsBanned() external givenSimpleAppIsCreated {
        vm.prank(deployer);
        registry.adminBanApp(address(SimpleApp(SIMPLE_APP)));

        vm.prank(DEFAULT_DEV);
        vm.expectRevert(BannedApp.selector);
        registry.upgradeApp(SimpleApp(SIMPLE_APP), DEFAULT_CLIENT, SIMPLE_APP_ID);
    }

    function test_revertWhen_upgradeApp_clientNotRegistered() external givenSimpleAppIsCreated {
        vm.prank(DEFAULT_DEV);
        vm.expectRevert(ClientNotRegistered.selector);
        registry.upgradeApp(SimpleApp(SIMPLE_APP), _randomAddress(), SIMPLE_APP_ID);
    }

    function test_revertWhen_upgradeApp_appIsNotLatestVersion(
        bytes32 newAppId
    ) external givenSimpleAppIsCreated {
        vm.assume(newAppId != SIMPLE_APP_ID);
        vm.assume(newAppId != EMPTY_UID);

        vm.prank(DEFAULT_DEV);
        vm.expectRevert(InvalidAppId.selector);
        registry.upgradeApp(SimpleApp(SIMPLE_APP), DEFAULT_CLIENT, newAppId);
    }

    function test_revertWhen_updateApp_notAllowed(
        address notAllowed
    ) external givenSimpleAppIsCreated {
        vm.assume(notAllowed != founder);
        vm.prank(notAllowed);
        vm.expectRevert(NotAllowed.selector);
        registry.updateApp(SimpleApp(SIMPLE_APP), appAccount);
    }

    function test_revertWhen_updateApp_appNotInstalled() external givenSimpleAppIsCreated {
        vm.prank(founder);
        vm.expectRevert(AppNotInstalled.selector);
        registry.updateApp(SimpleApp(SIMPLE_APP), appAccount);
    }

    function test_revertWhen_updateApp_appAlreadyInstalled() external givenSimpleAppIsCreated {
        SimpleApp appContract = SimpleApp(SIMPLE_APP);
        address appAddress = address(appContract);
        uint256 totalRequired = registry.getAppPrice(appAddress);

        hoax(founder, totalRequired);
        registry.installApp{value: totalRequired}(appContract, appAccount, "");

        vm.prank(founder);
        vm.expectRevert(AppAlreadyInstalled.selector);
        registry.updateApp(appContract, appAccount);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      SIMPLE APP TESTS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function test_simpleApp_withdrawETH() external {
        address app = _createSimpleApp(DEFAULT_CLIENT);

        uint256 totalRequired = registry.getAppPrice(app);

        vm.deal(founder, totalRequired);

        vm.prank(founder);
        registry.installApp{value: totalRequired}(ITownsApp(app), appAccount, "");

        vm.prank(DEFAULT_DEV);
        SimpleApp(payable(app)).withdrawETH(DEFAULT_DEV);

        assertEq(address(DEFAULT_DEV).balance, DEFAULT_INSTALL_PRICE);
    }

    function test_simpleApp_sendCurrency_onlyClient() external {
        address app = _createSimpleApp(DEFAULT_CLIENT);

        uint256 totalRequired = registry.getAppPrice(app);

        vm.deal(founder, totalRequired);

        vm.prank(founder);
        registry.installApp{value: totalRequired}(ITownsApp(app), appAccount, "");

        assertEq(address(app).balance, DEFAULT_INSTALL_PRICE);

        address recipient = _randomAddress();

        vm.prank(DEFAULT_CLIENT);
        SimpleApp(payable(app)).sendCurrency(recipient, address(0), DEFAULT_INSTALL_PRICE);

        assertEq(address(recipient).balance, DEFAULT_INSTALL_PRICE);
        assertEq(address(app).balance, 0);
    }

    function test_simpleApp_sendCurrency_onlyOwner() external {
        address app = _createSimpleApp(DEFAULT_CLIENT);
        uint256 totalRequired = registry.getAppPrice(app);

        vm.deal(founder, totalRequired);

        vm.prank(founder);
        registry.installApp{value: totalRequired}(ITownsApp(app), appAccount, "");

        assertEq(address(app).balance, DEFAULT_INSTALL_PRICE);

        address recipient = _randomAddress();

        vm.prank(DEFAULT_DEV);
        SimpleApp(payable(app)).sendCurrency(recipient, address(0), DEFAULT_INSTALL_PRICE);

        assertEq(address(recipient).balance, DEFAULT_INSTALL_PRICE);
        assertEq(address(app).balance, 0);
    }

    function test_revertWhen_simpleApp_sendCurrency_invalidCaller() external {
        address simple = _createSimpleApp(DEFAULT_CLIENT);

        vm.prank(_randomAddress());
        vm.expectRevert(ISimpleAppBase.InvalidCaller.selector);
        SimpleApp(payable(simple)).sendCurrency(DEFAULT_DEV, address(0), DEFAULT_INSTALL_PRICE);
    }

    function test_revertWhen_simpleApp_sendCurrency_invalidRecipient() external {
        address simpleApp = _createSimpleApp(DEFAULT_CLIENT);

        vm.prank(DEFAULT_DEV);
        vm.expectRevert(ISimpleAppBase.ZeroAddress.selector);
        SimpleApp(payable(simpleApp)).sendCurrency(address(0), address(0), DEFAULT_INSTALL_PRICE);
    }

    function test_revertWhen_simpleApp_sendCurrency_invalidAmount() external {
        address simpleApp = _createSimpleApp(DEFAULT_CLIENT);

        vm.prank(DEFAULT_DEV);
        vm.expectRevert(ISimpleAppBase.InvalidAmount.selector);
        SimpleApp(payable(simpleApp)).sendCurrency(DEFAULT_DEV, address(0), 0);
    }

    function test_revertWhen_simpleApp_sendCurrency_invalidCurrency() external {
        address simpleApp = _createSimpleApp(DEFAULT_CLIENT);

        vm.prank(DEFAULT_DEV);
        vm.expectRevert(ISimpleAppBase.InvalidCurrency.selector);
        SimpleApp(payable(simpleApp)).sendCurrency(
            DEFAULT_DEV,
            _randomAddress(),
            DEFAULT_INSTALL_PRICE
        );
    }

    function test_simpleApp_updatePricing() external {
        bytes32[] memory permissions = new bytes32[](1);
        permissions[0] = bytes32("Read");

        AppParams memory appData = AppParams({
            name: "simple.app",
            permissions: permissions,
            client: DEFAULT_CLIENT,
            installPrice: DEFAULT_INSTALL_PRICE,
            accessDuration: DEFAULT_ACCESS_DURATION,
            extraData: ""
        });

        uint256 newInstallPrice = DEFAULT_INSTALL_PRICE + 1;
        uint48 newAccessDuration = DEFAULT_ACCESS_DURATION + 1;

        vm.startPrank(DEFAULT_DEV);
        (address app, ) = registry.createApp(appData);
        SimpleApp(payable(app)).updatePricing(newInstallPrice, newAccessDuration);
        vm.stopPrank();

        assertEq(ITownsApp(app).installPrice(), newInstallPrice);
        assertEq(ITownsApp(app).accessDuration(), newAccessDuration);
    }

    function test_simpleApp_updatePermissions() external {
        bytes32[] memory permissions = new bytes32[](1);
        permissions[0] = bytes32("Read");
        AppParams memory appData = AppParams({
            name: "simple.app",
            permissions: permissions,
            client: DEFAULT_CLIENT,
            installPrice: DEFAULT_INSTALL_PRICE,
            accessDuration: DEFAULT_ACCESS_DURATION,
            extraData: ""
        });

        bytes32[] memory newPermissions = new bytes32[](2);
        newPermissions[0] = bytes32("Read");
        newPermissions[1] = bytes32("Write");

        vm.startPrank(DEFAULT_DEV);
        (address app, ) = registry.createApp(appData);
        SimpleApp(payable(app)).updatePermissions(newPermissions);
        vm.stopPrank();

        assertEq(ITownsApp(app).requiredPermissions(), newPermissions);
    }
}
