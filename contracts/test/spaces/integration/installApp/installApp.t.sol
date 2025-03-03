// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";

//interfaces
import {IAppRegistryBase} from "contracts/src/app/interfaces/IAppRegistry.sol";
import {IAppInstallerBase} from "contracts/src/app/interfaces/IAppInstaller.sol";
import {IAppHooks} from "contracts/src/app/interfaces/IAppHooks.sol";
import {IEntitlementsManager} from "contracts/src/spaces/facets/entitlements/IEntitlementsManager.sol";
import {IEntitlementBase} from "contracts/src/spaces/entitlements/IEntitlement.sol";

//libraries
import {Permissions} from "contracts/src/spaces/facets/Permissions.sol";

//contracts
import {InstallFacet} from "contracts/src/spaces/facets/install/InstallFacet.sol";

contract IntegrationInstallApp is
  BaseSetup,
  IAppRegistryBase,
  IAppInstallerBase,
  IEntitlementBase
{
  InstallFacet installFacet;
  IEntitlementsManager entitlementsManager;

  bytes1 internal constant CHANNEL_PREFIX = 0x20;

  address appAddress;
  address appOwner;
  uint256 appId;
  function setUp() public override {
    super.setUp();
    installFacet = InstallFacet(space);
    entitlementsManager = IEntitlementsManager(space);
    appAddress = _randomAddress();
    appOwner = _randomAddress();
  }

  modifier givenAppIsRegistered() {
    _registerApp();
    _;
  }

  modifier givenAppIsInstalled() {
    bytes32[] memory emptyChannelIds = new bytes32[](0);

    vm.prank(founder);
    vm.expectEmit(address(appInstaller));
    emit AppInstalled(space, appId, emptyChannelIds);
    installFacet.installApp(appId, emptyChannelIds);
    _;
  }

  function test_installApp() public givenAppIsRegistered givenAppIsInstalled {
    assertContains(appInstaller.installedApps(space), appId);
    assertTrue(
      entitlementsManager.isEntitledToSpace(appAddress, Permissions.Read)
    );
  }

  function test_installApp_onChannel() public givenAppIsRegistered {
    bytes32[] memory channelIds = new bytes32[](1);
    bytes32 defaultChannel = bytes32(
      bytes.concat(CHANNEL_PREFIX, bytes20(space))
    );
    channelIds[0] = defaultChannel;

    vm.prank(founder);
    installFacet.installApp(appId, channelIds);

    assertFalse(
      entitlementsManager.isEntitledToSpace(appAddress, Permissions.Read)
    );

    assertTrue(
      entitlementsManager.isEntitledToChannel(
        defaultChannel,
        appAddress,
        Permissions.Read
      )
    );
  }

  function test_installApp_revertWith_Entitlement__NotAllowed()
    public
    givenAppIsRegistered
  {
    bytes32[] memory emptyChannelIds = new bytes32[](0);

    vm.prank(_randomAddress());
    vm.expectRevert(Entitlement__NotAllowed.selector);
    installFacet.installApp(appId, emptyChannelIds);
  }

  function test_uninstallApp() public givenAppIsRegistered givenAppIsInstalled {
    bytes32[] memory emptyChannelIds = new bytes32[](0);

    vm.prank(founder);
    vm.expectEmit(address(appInstaller));
    emit AppUninstalled(space, appId, emptyChannelIds);
    installFacet.uninstallApp(appId, emptyChannelIds);

    assertEq(appInstaller.installedApps(space).length, 0);
  }

  function test_uninstallApp_revertWith_Entitlement__NotAllowed()
    public
    givenAppIsRegistered
    givenAppIsInstalled
  {
    bytes32[] memory emptyChannelIds = new bytes32[](0);

    vm.prank(_randomAddress());
    vm.expectRevert(Entitlement__NotAllowed.selector);
    installFacet.uninstallApp(appId, emptyChannelIds);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                         Internals                          */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function _registerApp() internal {
    string[] memory permissions = new string[](2);
    permissions[0] = Permissions.Read;
    permissions[1] = Permissions.Write;

    Registration memory registration = Registration({
      appAddress: appAddress,
      owner: appOwner,
      uri: "app.xyz",
      name: "App",
      symbol: "APP",
      permissions: permissions,
      hooks: IAppHooks(address(0)),
      disabled: false
    });

    vm.prank(appOwner);
    appId = appRegistry.register(registration);
  }
}
