// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {AppKey, AppId} from "contracts/src/factory/facets/app/libraries/AppId.sol";
import {AppIdLib} from "contracts/src/factory/facets/app/libraries/AppId.sol";
import {App} from "contracts/src/factory/facets/app/libraries/App.sol";
// contracts
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";
import {AppRegistry} from "contracts/src/factory/facets/app/AppRegistry.sol";
import {MockApp} from "contracts/test/mocks/MockApp.sol";
import {console} from "forge-std/console.sol";
contract AppRegistryTest is BaseSetup {
  AppRegistry registry;

  address appDeveloper;

  function setUp() public override {
    super.setUp();
    registry = AppRegistry(spaceFactory);
    appDeveloper = makeAddr("appDeveloper");
  }

  function test_register() public {
    MockApp app = new MockApp();

    AppKey memory appKey = AppKey({space: everyoneSpace, app: app});

    vm.prank(appDeveloper);
    registry.register(appKey);

    assertEq(app.onRegisterData(), new bytes(123));
    assertTrue(registry.isRegistered(appKey));

    App.State memory appState = registry.getRegistration(appKey);
    assertEq(appState.space, everyoneSpace);
    assertEq(uint256(appState.status), uint256(App.Status.Pending));
  }
}
