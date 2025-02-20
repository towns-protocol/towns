// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

//interfaces
import {IAppHooks, IAppHooksBase} from "contracts/src/app/interfaces/IAppHooks.sol";
import {IAppRegistryBase} from "contracts/src/app/interfaces/IAppRegistry.sol";
import {IAppInstallerBase} from "contracts/src/app/interfaces/IAppInstaller.sol";

//libraries
import {App} from "contracts/src/app/libraries/App.sol";
import {Permissions} from "contracts/src/spaces/facets/Permissions.sol";
import {HooksManager} from "contracts/src/app/libraries/HooksManager.sol";
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";
//contracts
import {AppRegistry} from "contracts/src/app/facets/AppRegistry.sol";
import {AppInstaller} from "contracts/src/app/facets/AppInstaller.sol";
import {MockAppHook} from "contracts/test/mocks/MockHook.sol";

import {DeployAppStore} from "contracts/scripts/deployments/diamonds/DeployAppStore.s.sol";

contract AppRegistryTest is
  TestUtils,
  IAppRegistryBase,
  IAppInstallerBase,
  IAppHooksBase
{
  uint256 internal constant MAX_CHANNELS = 100;

  DeployAppStore deployAppStore = new DeployAppStore();

  AppRegistry public appRegistry;
  AppInstaller public appInstaller;

  function setUp() external {
    address deployer = getDeployer();
    address appStore = deployAppStore.deploy(deployer);

    appRegistry = AppRegistry(appStore);
    appInstaller = AppInstaller(appStore);
  }

  modifier givenAppIsRegistered(Registration memory registration) {
    _registerApp(registration);
    _;
  }

  modifier assumeValidChannelIds(bytes32[] memory channelIds) {
    vm.assume(channelIds.length > 0);
    vm.assume(channelIds.length <= MAX_CHANNELS);
    for (uint256 i; i < channelIds.length; ++i) {
      vm.assume(channelIds[i] != bytes32(uint256(uint160(ZERO_SENTINEL))));
    }
    _;
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                         Register                           */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function test_register(
    Registration memory registration
  ) external givenAppIsRegistered(registration) {
    assertTrue(appRegistry.isRegistered(registration.appAddress));

    Registration memory reg = appRegistry.getRegistration(
      registration.appAddress
    );

    assertEq(reg.uri, registration.uri);
    assertEq(reg.permissions, registration.permissions);
    assertEq(reg.disabled, registration.disabled);
  }

  function test_register_revertWith_AppTooManyPermissions() external {
    string[] memory permissions = new string[](51); // Over MAX_PERMISSIONS (50)
    for (uint i = 0; i < 51; i++) {
      permissions[i] = string(abi.encodePacked("permission", i));
    }

    Registration memory registration = Registration({
      appAddress: makeAddr("app"),
      owner: makeAddr("owner"),
      uri: "uri",
      name: "name",
      symbol: "symbol",
      disabled: false,
      permissions: permissions,
      hooks: IAppHooks(address(0))
    });

    vm.prank(registration.owner);
    vm.expectRevert(AppTooManyPermissions.selector);
    appRegistry.register(registration);
  }

  function test_register_revertWith_AppNotOwnedBySender(
    address notOwner,
    Registration memory registration
  ) external givenAppIsRegistered(registration) {
    vm.assume(notOwner != registration.owner);
    vm.prank(notOwner);
    vm.expectRevert(AppNotOwnedBySender.selector);
    appRegistry.register(registration);
  }

  function test_register_revertWith_AppAlreadyRegistered(
    Registration memory registration
  ) external givenAppIsRegistered(registration) {
    vm.prank(registration.owner);
    vm.expectRevert(AppAlreadyRegistered.selector);
    appRegistry.register(registration);
  }

  function test_register_revertWith_AppDisabled() external {
    Registration memory registration = Registration({
      appAddress: makeAddr("app"),
      owner: makeAddr("owner"),
      uri: "uri",
      name: "name",
      symbol: "symbol",
      disabled: true,
      permissions: new string[](0),
      hooks: IAppHooks(address(0))
    });

    vm.prank(registration.owner);
    vm.expectRevert(AppDisabled.selector);
    appRegistry.register(registration);
  }

  function test_register_revertWith_AppPermissionsMissing() external {
    Registration memory registration = Registration({
      appAddress: makeAddr("app"),
      owner: makeAddr("owner"),
      uri: "uri",
      name: "name",
      symbol: "symbol",
      disabled: false,
      permissions: new string[](0),
      hooks: IAppHooks(address(0))
    });

    vm.prank(registration.owner);
    vm.expectRevert(AppPermissionsMissing.selector);
    appRegistry.register(registration);
  }

  function test_register_revertWith_AppPermissionNotAllowed() external {
    string[] memory permissions = new string[](1);
    permissions[0] = Permissions.InstallApp;

    Registration memory registration = Registration({
      appAddress: makeAddr("app"),
      owner: makeAddr("owner"),
      uri: "uri",
      name: "name",
      symbol: "symbol",
      disabled: false,
      permissions: permissions,
      hooks: IAppHooks(address(0))
    });

    vm.prank(registration.owner);
    vm.expectRevert(AppInvalidPermission.selector);
    appRegistry.register(registration);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                   Update Registration                      */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
  function test_updateRegistration(Registration memory registration) external {
    uint256 appId = _registerApp(registration);

    UpdateRegistration memory update = UpdateRegistration({
      uri: "newUri",
      permissions: new string[](0),
      hooks: IAppHooks(address(0)),
      disabled: false
    });

    vm.prank(registration.owner);
    vm.expectEmit(address(appInstaller));
    emit AppUpdated(registration.owner, registration.appAddress, appId, update);
    appRegistry.updateRegistration(appId, update);
  }

  function test_updateRegistration_revertWith_AppNotRegistered() external {
    UpdateRegistration memory update = UpdateRegistration({
      uri: "newUri",
      permissions: new string[](0),
      hooks: IAppHooks(address(0)),
      disabled: false
    });

    vm.prank(makeAddr("notOwner"));
    vm.expectRevert(AppNotRegistered.selector);
    appRegistry.updateRegistration(1, update);
  }

  function test_updateRegistration_revertWith_AppInvalidPermission(
    Registration memory registration
  ) external givenAppIsRegistered(registration) {
    string[] memory permissions = new string[](1);
    permissions[0] = Permissions.InstallApp;

    UpdateRegistration memory update = UpdateRegistration({
      uri: "newUri",
      permissions: permissions,
      hooks: IAppHooks(address(0)),
      disabled: false
    });

    vm.prank(registration.owner);
    vm.expectRevert(AppInvalidPermission.selector);
    appRegistry.updateRegistration(1, update);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                    App Installation                        */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function test_install(Registration memory registration) external {
    uint256 appId = _registerApp(registration);

    address space = makeAddr("space");
    bytes32[] memory channelIds = new bytes32[](1);
    channelIds[0] = bytes32("cool-channel");

    _installApp(appId, space, channelIds);

    uint256 balance = appInstaller.balanceOf(space, appId);
    assertEq(balance, 1);
  }

  function test_install_revertWith_AppTooManyChannels(
    Registration memory registration
  ) external {
    uint256 appId = _registerApp(registration);

    bytes32[] memory channelIds = new bytes32[](101); // Over MAX_CHANNELS (100)
    for (uint i = 0; i < 101; i++) {
      channelIds[i] = bytes32(abi.encodePacked("channel", i));
    }

    vm.expectRevert(AppTooManyChannels.selector);
    appInstaller.install(appId, channelIds);
  }

  function test_install_revertWith_AppNotRegistered() external {
    address space = makeAddr("space");
    uint256 appId = _randomUint256();
    bytes32[] memory channelIds = new bytes32[](1);
    channelIds[0] = bytes32("cool-channel");

    vm.prank(space);
    vm.expectRevert(AppNotRegistered.selector);
    appInstaller.install(appId, channelIds);
  }

  function test_install_revertWith_AppAlreadyInstalled(
    Registration memory registration
  ) external {
    uint256 appId = _registerApp(registration);

    address space = makeAddr("space");
    bytes32[] memory channelIds = new bytes32[](1);
    channelIds[0] = bytes32("cool-channel");

    _installApp(appId, space, channelIds);

    vm.prank(space);
    vm.expectRevert(AppAlreadyInstalled.selector);
    appInstaller.install(appId, channelIds);
  }

  function test_isEntitled_withValidPermission() external {
    Registration memory registration = _createBasicRegistration();
    uint256 appId = _registerApp(registration);

    bytes32[] memory channelIds = new bytes32[](1);
    channelIds[0] = bytes32("channel1");
    address user = makeAddr("user");

    vm.prank(user);
    appInstaller.install(appId, channelIds);

    bool entitled = appInstaller.isEntitled(
      user,
      channelIds[0],
      registration.appAddress,
      bytes32(bytes(Permissions.Read))
    );
    assertTrue(entitled);
  }

  function test_isEntitled_withInvalidPermission() external {
    Registration memory registration = _createBasicRegistration();
    uint256 appId = _registerApp(registration);

    bytes32[] memory channelIds = new bytes32[](1);
    channelIds[0] = bytes32("channel1");
    address user = makeAddr("user");

    vm.prank(user);
    appInstaller.install(appId, channelIds);

    bool entitled = appInstaller.isEntitled(
      user,
      channelIds[0],
      registration.appAddress,
      bytes32("invalid_permission")
    );
    assertFalse(entitled);
  }

  function test_multipleInstallations_sameApp() external {
    Registration memory registration = _createBasicRegistration();
    uint256 appId = _registerApp(registration);

    bytes32[] memory channels1 = new bytes32[](1);
    channels1[0] = bytes32("channel1");

    bytes32[] memory channels2 = new bytes32[](1);
    channels2[0] = bytes32("channel2");

    address user = makeAddr("user");
    vm.startPrank(user);
    appInstaller.install(appId, channels1);
    appInstaller.install(appId, channels2);
    vm.stopPrank();

    // Should only have one token regardless of multiple installations
    assertEq(appInstaller.balanceOf(user, appId), 1);

    // Should be entitled to both channels
    assertTrue(
      appInstaller.isEntitled(
        user,
        channels1[0],
        registration.appAddress,
        bytes32(bytes(Permissions.Read))
      )
    );
    assertTrue(
      appInstaller.isEntitled(
        user,
        channels2[0],
        registration.appAddress,
        bytes32(bytes(Permissions.Read))
      )
    );
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                         Uninstall                          */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  struct Install {
    address space;
    bytes32[] channelIds;
  }

  function test_uninstall(
    Registration memory registration,
    Install memory install
  ) external {
    uint256 appId = _registerApp(registration);
    _installApp(appId, install.space, install.channelIds);

    uint256 balance = appInstaller.balanceOf(install.space, appId);
    assertEq(balance, 1);

    _uninstallApp(appId, install.space, install.channelIds);

    balance = appInstaller.balanceOf(install.space, appId);
    assertEq(balance, 0);
  }

  function test_uninstall_revertWith_AppNotRegistered() external {
    uint256 appId = _randomUint256();
    address space = makeAddr("space");
    bytes32[] memory channelIds = new bytes32[](1);
    channelIds[0] = bytes32("cool-channel");

    vm.prank(space);
    vm.expectRevert(AppNotRegistered.selector);
    appInstaller.uninstall(appId, channelIds);
  }

  function test_uninstall_revertWith_AppNotInstalled(
    Registration memory registration,
    Install memory install
  ) external assumeValidChannelIds(install.channelIds) {
    uint256 appId = _registerApp(registration);

    vm.prank(install.space);
    vm.expectRevert(AppNotInstalled.selector);
    appInstaller.uninstall(appId, install.channelIds);
  }

  function test_uninstall_partialChannels() external {
    Registration memory registration = _createBasicRegistration();
    uint256 appId = _registerApp(registration);

    bytes32[] memory allChannels = new bytes32[](2);
    allChannels[0] = bytes32("channel1");
    allChannels[1] = bytes32("channel2");

    bytes32[] memory partialChannels = new bytes32[](1);
    partialChannels[0] = allChannels[0];

    address user = makeAddr("user");
    vm.startPrank(user);

    appInstaller.install(appId, allChannels);
    appInstaller.uninstall(appId, partialChannels);

    // Should still have token as not all channels are uninstalled
    assertEq(appInstaller.balanceOf(user, appId), 1);
    vm.stopPrank();
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           Hooks                            */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
  function test_hookExecution_onInstall(
    Install memory install
  ) external assumeValidChannelIds(install.channelIds) {
    MockAppHook mockHook = new MockAppHook();

    mockHook.setPermission({
      beforeRegister: false,
      afterRegister: false,
      beforeInstall: true,
      afterInstall: true,
      beforeUninstall: false,
      afterUninstall: false
    });

    Registration memory registration = _createBasicRegistration();
    registration.hooks = IAppHooks(address(mockHook));

    vm.prank(registration.owner);
    uint256 appId = appRegistry.register(registration);

    vm.expectEmit(address(appInstaller));
    emit HookExecuted(
      address(mockHook),
      IAppHooks.beforeInstall.selector,
      true
    );
    vm.expectEmit(address(appInstaller));
    emit HookExecuted(address(mockHook), IAppHooks.afterInstall.selector, true);
    vm.prank(install.space);
    appInstaller.install(appId, install.channelIds);
  }

  function test_hookFailure_reverts() external {
    MockAppHook mockHook = new MockAppHook();
    mockHook.setShouldFail(true);
    mockHook.setPermission({
      beforeRegister: true,
      afterRegister: false,
      beforeInstall: false,
      afterInstall: false,
      beforeUninstall: false,
      afterUninstall: false
    });

    Registration memory registration = _createBasicRegistration();
    registration.hooks = IAppHooks(address(mockHook));

    vm.prank(registration.owner);
    vm.expectRevert(
      abi.encodeWithSelector(
        CustomRevert.WrappedError.selector,
        address(mockHook), // hook address
        IAppHooks.beforeRegister.selector, // original error selector
        abi.encodeWithSelector(HookNotImplemented.selector),
        abi.encodeWithSelector(HooksManager.HookCallFailed.selector)
      )
    );
    appRegistry.register(registration);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                        Internal                            */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function _installApp(
    uint256 appId,
    address space,
    bytes32[] memory channelIds
  ) internal assumeEOA(space) assumeValidChannelIds(channelIds) {
    vm.prank(space);
    vm.expectEmit(address(appInstaller));
    emit AppInstalled(space, appId, channelIds);
    appInstaller.install(appId, channelIds);
  }

  function _uninstallApp(
    uint256 appId,
    address space,
    bytes32[] memory channelIds
  ) internal assumeEOA(space) assumeValidChannelIds(channelIds) {
    vm.prank(space);
    vm.expectEmit(address(appInstaller));
    emit AppUninstalled(space, appId, channelIds);
    appInstaller.uninstall(appId, channelIds);
  }

  function _createBasicRegistration() internal returns (Registration memory) {
    string[] memory permissions = new string[](2);
    permissions[0] = Permissions.Read;
    permissions[1] = Permissions.Write;

    return
      Registration({
        appAddress: makeAddr("app"),
        owner: makeAddr("owner"),
        uri: "uri",
        name: "name",
        symbol: "symbol",
        disabled: false,
        permissions: permissions,
        hooks: IAppHooks(address(0))
      });
  }

  function _registerApp(
    Registration memory registration
  ) internal returns (uint256 appId) {
    vm.assume(bytes(registration.uri).length > 0);
    vm.assume(bytes(registration.name).length > 0);
    vm.assume(bytes(registration.symbol).length > 0);
    vm.assume(registration.owner != address(0));
    vm.assume(registration.owner != address(0));
    vm.assume(registration.appAddress != address(0));
    vm.assume(appRegistry.isRegistered(registration.appAddress) == false);
    registration.disabled = false;

    string[] memory permissions = new string[](2);
    permissions[0] = Permissions.Read;
    permissions[1] = Permissions.Write;

    registration.hooks = IAppHooks(address(0));
    registration.permissions = permissions;

    vm.prank(registration.owner);
    vm.expectEmit(address(appInstaller));
    emit AppRegistered(
      registration.owner,
      registration.appAddress,
      1,
      registration
    );
    return appRegistry.register(registration);
  }
}
